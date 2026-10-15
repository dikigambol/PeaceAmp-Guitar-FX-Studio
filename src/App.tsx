import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import type {
  AudioDeviceInfo,
  AudioEngineMetrics,
  EngineStatus,
  InputChannelMode,
  MeterData,
} from './types/audio';
import { DEFAULT_NOISE_GATE_ENABLED, DEFAULT_NOISE_GATE_THRESHOLD_DB } from './types/audio';
import type { PedalInstance } from './types/pedal';
import type { PresetSchema } from './types/preset';
import type { TunerResult } from './dsp/tuner/pitchDetector';
import { PEDAL_DEFINITIONS } from './audio/pedals/registry';
import {
  loadAllPresets,
  saveUserPreset,
  renameUserPreset,
  deleteUserPreset,
  exportPresetsToJson,
} from './presets/presetStorage';
import { AudioHeader } from './components/AudioHeader';
import { InputPreampPanel } from './components/sidebar/InputPreampPanel';
import { ChromaticTuner } from './components/tuner/ChromaticTuner';
import { CabinetSimulatorPanel } from './components/sidebar/CabinetSimulatorPanel';
import { AmpHeadPanel } from './components/sidebar/AmpHeadPanel';
import { MasterOutputPanel } from './components/sidebar/MasterOutputPanel';
import { Pedalboard, calculateNextPedalPosition, type PatchConnection } from './components/pedalboard/Pedalboard';
import { HeadphoneWarning } from './components/HeadphoneWarning';
import { ManualModal } from './components/manual/ManualModal';
import { DesktopOnlyBlocker } from './components/common/DesktopOnlyBlocker';
import type { CabinetSettings } from './types/cabinet';
import type { AmpHeadSettings } from './types/amp';
import { AlertOctagon, X, BookOpen } from 'lucide-react';
import './index.css';

const defaultMeter: MeterData = {
  rms: 0,
  peak: 0,
  rmsDb: -100,
  peakDb: -100,
  peakHoldDb: -100,
  isClipping: false,
  clipHold: false,
};

const defaultMetrics: AudioEngineMetrics = {
  sampleRate: 0,
  baseLatency: 0,
  outputLatency: 0,
  totalLatencyMs: 0,
  currentTime: 0,
};

export function App() {
  const engineRef = useRef<AudioEngine | null>(null);

  const [status, setStatus] = useState<EngineStatus>('uninitialized');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const [devices, setDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [outputDevices, setOutputDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState<string>('');
  const [isOutputSelectionSupported, setIsOutputSelectionSupported] = useState<boolean>(true);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  const [inputGain, setInputGain] = useState(1.0);
  const [inputChannelMode, setInputChannelMode] = useState<InputChannelMode>('sum');
  const [noiseGateEnabled, setNoiseGateEnabled] = useState(DEFAULT_NOISE_GATE_ENABLED);
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(DEFAULT_NOISE_GATE_THRESHOLD_DB);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Preset management
  const [presets, setPresets] = useState<PresetSchema[]>(() => loadAllPresets());
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);

  // Active pedals list (initialized as empty board by default)
  const [pedals, setPedals] = useState<PedalInstance[]>([]);
  const pedalsRef = useRef<PedalInstance[]>(pedals);
  pedalsRef.current = pedals;

  // Pedalboard Canvas Layout & Routing State (Clean board by default on fresh page load)
  const [pedalPositions, setPedalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [patchConnections, setPatchConnections] = useState<PatchConnection[]>([]);

  // Dedicated Cabinet IR Simulator State
  const [cabinetSettings, setCabinetSettings] = useState<CabinetSettings>({
    enabled: true,
    model: '4x12-closed',
    mic: 'sm57',
    position: 0.5,
    distance: 0.15,
    mix: 1.0,
    level: 0,
  });

  // Dedicated Guitar Amp Head State (Preamp Tube Drive, FMV Tone Stack, Power Sag)
  const [ampHeadSettings, setAmpHeadSettings] = useState<AmpHeadSettings>({
    enabled: true,
    model: 'pristine-clean',
    gain: 5.0,
    bass: 5.0,
    mid: 5.0,
    treble: 5.0,
    presence: 5.0,
    master: 6.0,
  });

  // Tuner & Telemetry (Default: Non-aktif/Bypass; saat AKTIF output otomatis di-mute untuk silent tuning)
  const [tunerEnabled, setTunerEnabled] = useState(false);
  const tunerEnabledRef = useRef(tunerEnabled);
  tunerEnabledRef.current = tunerEnabled;
  const [tunerResult, setTunerResult] = useState<TunerResult | null>(null);
  const [metrics, setMetrics] = useState<AudioEngineMetrics>(defaultMetrics);
  const [inputMeter, setInputMeter] = useState<MeterData>(defaultMeter);
  const [outputMeter, setOutputMeter] = useState<MeterData>(defaultMeter);

  // Initialize engine once
  useEffect(() => {
    const engine = new AudioEngine((newStatus, error) => {
      setStatus(newStatus);
      setErrorMessage(error);
    });
    engine.setPedalInstances([]);
    engineRef.current = engine;

    // Load available input and output devices
    engine.getAudioDevices().then((devList) => {
      setDevices(devList);
      if (devList.length > 0) {
        setSelectedDeviceId((prev) => prev || devList[0].deviceId);
      }
    });

    engine.getAudioOutputDevices().then((outList) => {
      setOutputDevices(outList);
      if (outList.length > 0) {
        setSelectedOutputDeviceId((prev) => prev || outList[0].deviceId);
      }
    });

    setIsOutputSelectionSupported(engine.isOutputSelectionSupported());

    return () => {
      engine.stop();
    };
  }, []);

  // Auto-dismiss audio error toast after 6 seconds
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Metering, Telemetry, and Tuner animation loop
  useEffect(() => {
    let animId: number;
    let frameCount = 0;

    const renderLoop = () => {
      if (engineRef.current && status === 'running') {
        const inM = engineRef.current.getMeterData('input');
        const outM = engineRef.current.getMeterData('output');
        setInputMeter(inM);
        setOutputMeter(outM);

        const currentMetrics = engineRef.current.getMetrics();
        setMetrics(currentMetrics);

        // Run chromatic pitch detection every 2 frames (~30Hz refresh) for responsive needle tracking
        frameCount++;
        if (frameCount % 2 === 0) {
          if (tunerEnabledRef.current) {
            const pitch = engineRef.current.detectTunerPitch();
            setTunerResult(pitch);
          } else {
            setTunerResult(null);
          }
        }
      } else if (status !== 'running') {
        setInputMeter(defaultMeter);
        setOutputMeter(defaultMeter);
        setTunerResult(null);
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [status]);

  const refreshDevices = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      const [devList, outList] = await Promise.all([
        engineRef.current.getAudioDevices(),
        engineRef.current.getAudioOutputDevices(),
      ]);
      setDevices(devList);
      setOutputDevices(outList);

      if (devList.length > 0) {
        const activeId = engineRef.current.getSelectedInputId();
        if (activeId && devList.some((d) => d.deviceId === activeId)) {
          setSelectedDeviceId(activeId);
        } else if (!selectedDeviceId || !devList.some((d) => d.deviceId === selectedDeviceId)) {
          setSelectedDeviceId(devList[0].deviceId);
        }
      }

      if (outList.length > 0) {
        const activeOutId = engineRef.current.getSelectedOutputId();
        if (activeOutId && outList.some((d) => d.deviceId === activeOutId)) {
          setSelectedOutputDeviceId(activeOutId);
        } else if (!selectedOutputDeviceId || !outList.some((d) => d.deviceId === selectedOutputDeviceId)) {
          setSelectedOutputDeviceId(outList[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
    }
  }, [selectedDeviceId, selectedOutputDeviceId]);

  const handleRefreshDevices = useCallback(async () => {
    if (!engineRef.current) return;
    setIsRefreshingDevices(true);
    try {
      await engineRef.current.requestDeviceAccess();
      const [devList, outList] = await Promise.all([
        engineRef.current.getAudioDevices(),
        engineRef.current.getAudioOutputDevices(),
      ]);
      setDevices(devList);
      setOutputDevices(outList);

      if (devList.length > 0) {
        const activeId = engineRef.current.getSelectedInputId();
        if (activeId && devList.some((d) => d.deviceId === activeId)) {
          setSelectedDeviceId(activeId);
        } else if (!selectedDeviceId || !devList.some((d) => d.deviceId === selectedDeviceId)) {
          setSelectedDeviceId(devList[0].deviceId);
        }
      }

      if (outList.length > 0) {
        const activeOutId = engineRef.current.getSelectedOutputId();
        if (activeOutId && outList.some((d) => d.deviceId === activeOutId)) {
          setSelectedOutputDeviceId(activeOutId);
        } else if (!selectedOutputDeviceId || !outList.some((d) => d.deviceId === selectedOutputDeviceId)) {
          setSelectedOutputDeviceId(outList[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Failed to request device access:', err);
    } finally {
      setTimeout(() => {
        setIsRefreshingDevices(false);
      }, 500);
    }
  }, [selectedDeviceId, selectedOutputDeviceId]);

  // Automatically refresh device list when audio hardware or virtual cables are plugged/unplugged
  useEffect(() => {
    const onDeviceChange = () => {
      refreshDevices();
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
    };
  }, [refreshDevices]);

  const handleTogglePower = async () => {
    if (!engineRef.current) return;
    setErrorMessage(null);

    if (status === 'running') {
      await engineRef.current.stop();
    } else {
      setIsLoading(true);
      try {
        await engineRef.current.start(selectedDeviceId || undefined, selectedOutputDeviceId || undefined);
        await refreshDevices();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error starting audio';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (engineRef.current) {
      try {
        await engineRef.current.setInputDevice(deviceId);
        const activeId = engineRef.current.getSelectedInputId();
        if (activeId) {
          setSelectedDeviceId(activeId);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal beralih ke input audio yang dipilih';
        setErrorMessage(msg);
      }
    }
  };

  const handleOutputDeviceChange = async (deviceId: string) => {
    setSelectedOutputDeviceId(deviceId);
    if (engineRef.current) {
      try {
        const ok = await engineRef.current.setOutputDevice(deviceId);
        if (!ok && !engineRef.current.isOutputSelectionSupported()) {
          setErrorMessage('Browser ini tidak mendukung pemilihan perangkat output (AudioContext.setSinkId).');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal beralih ke output audio yang dipilih';
        setErrorMessage(msg);
      }
    }
  };

  const handleInputGainChange = useCallback((val: number) => {
    setInputGain(val);
    engineRef.current?.setInputGain(val);
  }, []);

  const handleInputChannelModeChange = useCallback((mode: InputChannelMode) => {
    setInputChannelMode(mode);
    engineRef.current?.setInputChannelMode(mode);
  }, []);

  const handleNoiseGateChange = useCallback((enabled: boolean, thresholdDb: number) => {
    setNoiseGateEnabled(enabled);
    setNoiseGateThreshold(thresholdDb);
    engineRef.current?.setNoiseGate(enabled, thresholdDb);
  }, []);

  const handleMasterVolumeChange = useCallback((val: number) => {
    setMasterVolume(val);
    engineRef.current?.setMasterVolume(val);
  }, []);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    engineRef.current?.setMute(nextMute);
  };

  // Toggle Chromatic Tuner: saat Aktif output di-mute (Silent Tuning), saat Bypass suara kembali keluar
  const handleToggleTuner = useCallback(() => {
    setTunerEnabled((prev) => {
      const next = !prev;
      setIsMuted(next);
      engineRef.current?.setMute(next);
      return next;
    });
  }, []);

  // Pedalboard Actions
  const handleTogglePedalEnabled = useCallback((pedalId: string) => {
    const target = pedalsRef.current.find((p) => p.id === pedalId);
    if (!target) return;
    const nextEnabled = !target.enabled;

    try {
      engineRef.current?.setPedalEnabled(pedalId, nextEnabled);
    } catch (err) {
      console.warn('Failed to update audio engine bypass state:', err);
    }

    setPedals((prev) => prev.map((p) => (p.id === pedalId ? { ...p, enabled: nextEnabled } : p)));
  }, []);

  const handleChangePedalParam = (pedalId: string, paramId: string, val: number) => {
    setPedals((prev) =>
      prev.map((p) => {
        if (p.id !== pedalId) return p;
        return {
          ...p,
          parameters: {
            ...p.parameters,
            [paramId]: val,
          },
        };
      })
    );
    engineRef.current?.updatePedalParameter(pedalId, paramId, val);
  };

  const handleAddPedal = useCallback((type: string) => {
    const def = PEDAL_DEFINITIONS[type];
    if (!def) return;

    const defaultParams: Record<string, number> = {};
    for (const p of def.parameters) {
      defaultParams[p.id] = p.defaultValue;
    }

    const newInstance: PedalInstance = {
      id: `pedal-${type}-${Date.now().toString(36)}`,
      type,
      name: def.name,
      enabled: true,
      parameters: defaultParams,
    };

    const currentPedals = pedalsRef.current;
    const nextPedals = [...currentPedals, newInstance];
    setPedals(nextPedals);
    engineRef.current?.setPedalInstances(nextPedals);

    // Auto-place pedal position: always after the last pedal, filling empty slots, non-overlapping
    setPedalPositions((prevPos) => {
      const nextPos = { ...prevPos };
      if (!nextPos[newInstance.id]) {
        nextPos[newInstance.id] = calculateNextPedalPosition(
          newInstance,
          currentPedals,
          prevPos,
          1200
        );
        try {
          localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(nextPos));
        } catch { }
      }
      return nextPos;
    });

    // Auto-wire: automatically wire the new pedal into the signal chain
    setPatchConnections((prevConns) => {
      // Case 1: First pedal added to empty board
      if (currentPedals.length === 0 || prevConns.length === 0 || (prevConns.length === 1 && prevConns[0].id === 'conn-direct-bypass')) {
        const fresh: PatchConnection[] = [
          {
            id: `conn-in-${newInstance.id}`,
            fromNodeId: 'BOARD_INPUT',
            toNodeId: newInstance.id,
            cableColor: 'bone-ivory',
          },
          {
            id: `conn-${newInstance.id}-out`,
            fromNodeId: newInstance.id,
            toNodeId: 'BOARD_OUTPUT',
            cableColor: 'bone-ivory',
          },
        ];
        try {
          localStorage.setItem('web_guitar_patch_cables', JSON.stringify(fresh));
        } catch { }
        return fresh;
      }

      // Case 2: Additional pedal added to board with existing pedals
      const toOutputConn = prevConns.find((c) => c.toNodeId === 'BOARD_OUTPUT');
      const filtered = prevConns.filter(
        (c) => c.toNodeId !== 'BOARD_OUTPUT' && c.id !== 'conn-direct-bypass'
      );
      const nextConns: PatchConnection[] = [...filtered];

      if (toOutputConn) {
        // Splice newInstance between previous output pedal and BOARD_OUTPUT
        nextConns.push({
          id: `conn-${toOutputConn.fromNodeId}-${newInstance.id}`,
          fromNodeId: toOutputConn.fromNodeId,
          toNodeId: newInstance.id,
          cableColor: 'bone-ivory',
        });
      } else {
        const prevLastPedal = currentPedals[currentPedals.length - 1];
        if (prevLastPedal) {
          nextConns.push({
            id: `conn-${prevLastPedal.id}-${newInstance.id}`,
            fromNodeId: prevLastPedal.id,
            toNodeId: newInstance.id,
            cableColor: 'bone-ivory',
          });
        }
      }

      // Connect newInstance out to BOARD_OUTPUT
      nextConns.push({
        id: `conn-${newInstance.id}-out`,
        fromNodeId: newInstance.id,
        toNodeId: 'BOARD_OUTPUT',
        cableColor: 'bone-ivory',
      });

      // Ensure BOARD_INPUT is connected to the first pedal if missing
      if (!nextConns.some((c) => c.fromNodeId === 'BOARD_INPUT')) {
        const firstPedalId = currentPedals[0]?.id || newInstance.id;
        nextConns.unshift({
          id: `conn-in-${firstPedalId}`,
          fromNodeId: 'BOARD_INPUT',
          toNodeId: firstPedalId,
          cableColor: 'bone-ivory',
        });
      }

      try {
        localStorage.setItem('web_guitar_patch_cables', JSON.stringify(nextConns));
      } catch { }

      return nextConns;
    });
  }, []);

  const handleRemovePedal = (pedalId: string) => {
    setPedals((prev) => {
      const next = prev.filter((p) => p.id !== pedalId);
      engineRef.current?.setPedalInstances(next);
      return next;
    });

    setPatchConnections((prev) => {
      const inConn = prev.find((c) => c.toNodeId === pedalId);
      const outConn = prev.find((c) => c.fromNodeId === pedalId);
      const filtered = prev.filter((c) => c.fromNodeId !== pedalId && c.toNodeId !== pedalId);

      // If removed pedal had incoming and outgoing connections, bridge them
      if (inConn && outConn) {
        filtered.push({
          id: `conn-${inConn.fromNodeId}-${outConn.toNodeId}`,
          fromNodeId: inConn.fromNodeId,
          toNodeId: outConn.toNodeId,
          cableColor: 'bone-ivory',
        });
      }

      // If board is now empty, set direct bypass
      if (pedals.length <= 1) {
        const directBypass: PatchConnection[] = [
          {
            id: 'conn-direct-bypass',
            fromNodeId: 'BOARD_INPUT',
            toNodeId: 'BOARD_OUTPUT',
            cableColor: 'bone-ivory',
          },
        ];
        try {
          localStorage.setItem('web_guitar_patch_cables', JSON.stringify(directBypass));
        } catch { }
        return directBypass;
      }

      try {
        localStorage.setItem('web_guitar_patch_cables', JSON.stringify(filtered));
      } catch { }
      return filtered;
    });
  };

  const handleMovePedal = (pedalId: string, direction: 'left' | 'right') => {
    setPedals((prev) => {
      const idx = prev.findIndex((p) => p.id === pedalId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(targetIdx, 0, item);

      engineRef.current?.setPedalInstances(next);
      return next;
    });
  };

  const handleActiveChainChange = useCallback((activePedals: PedalInstance[]) => {
    engineRef.current?.setPedalInstances(activePedals);
  }, []);

  // Cabinet Actions
  const handleUpdateCabinetSettings = useCallback((newSettings: Partial<CabinetSettings>) => {
    setCabinetSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      engineRef.current?.updateCabinetSettings(newSettings);
      return updated;
    });
  }, []);

  const handleLoadCustomCabinetIR = useCallback(async (file: File) => {
    if (!engineRef.current) return;
    try {
      const fileName = await engineRef.current.loadCustomCabinetIRFromFile(file);
      setCabinetSettings((prev) => ({
        ...prev,
        model: 'custom',
        customIrName: fileName,
      }));
    } catch (err) {
      console.error('Failed to load custom IR', err);
      alert('Gagal memuat file IR. Pastikan file berformat audio WAV valid.');
    }
  }, []);

  // Amp Head Actions
  const handleUpdateAmpHeadSettings = useCallback((newSettings: Partial<AmpHeadSettings>) => {
    setAmpHeadSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      engineRef.current?.updateAmpHeadSettings(newSettings);
      return updated;
    });
  }, []);

  // Preset Actions
  const handleSelectPreset = useCallback((preset: PresetSchema) => {
    setCurrentPresetId(preset.id);
    // Ensure all pedals in loaded preset are active (ON) and ready to play
    const activePedals = preset.pedals.map((p) => ({
      ...p,
      enabled: true,
    }));
    setPedals(activePedals);
    engineRef.current?.setPedalInstances(activePedals);

    // Restore custom canvas pedal positions if present in preset
    if (preset.pedalPositions && Object.keys(preset.pedalPositions).length > 0) {
      setPedalPositions(preset.pedalPositions);
      try {
        localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(preset.pedalPositions));
      } catch { }
    } else if (activePedals.length > 0) {
      const autoPos: Record<string, { x: number; y: number }> = {};
      activePedals.forEach((p, idx) => {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        autoPos[p.id] = {
          x: Math.max(120, 1200 - 140 - 204 - col * 270),
          y: 40 + row * 410,
        };
      });
      setPedalPositions(autoPos);
      try {
        localStorage.setItem('web_guitar_pedal_coords', JSON.stringify(autoPos));
      } catch { }
    }

    // Restore custom patch cables if present in preset
    if (preset.connections && preset.connections.length > 0) {
      setPatchConnections(preset.connections);
      try {
        localStorage.setItem('web_guitar_patch_cables', JSON.stringify(preset.connections));
      } catch { }
    } else if (activePedals.length > 0) {
      // Auto-wire sequentially if preset has pedals but connections were not explicitly saved
      const autoConns: PatchConnection[] = [];
      autoConns.push({
        id: `conn-in-${activePedals[0].id}`,
        fromNodeId: 'BOARD_INPUT',
        toNodeId: activePedals[0].id,
        cableColor: 'bone-ivory',
      });
      for (let i = 0; i < activePedals.length - 1; i++) {
        autoConns.push({
          id: `conn-${activePedals[i].id}-${activePedals[i + 1].id}`,
          fromNodeId: activePedals[i].id,
          toNodeId: activePedals[i + 1].id,
          cableColor: 'bone-ivory',
        });
      }
      autoConns.push({
        id: `conn-${activePedals[activePedals.length - 1].id}-out`,
        fromNodeId: activePedals[activePedals.length - 1].id,
        toNodeId: 'BOARD_OUTPUT',
        cableColor: 'bone-ivory',
      });
      setPatchConnections(autoConns);
      try {
        localStorage.setItem('web_guitar_patch_cables', JSON.stringify(autoConns));
      } catch { }
    } else {
      setPatchConnections([]);
      try {
        localStorage.removeItem('web_guitar_patch_cables');
      } catch { }
    }

    if (preset.inputGain !== undefined) handleInputGainChange(preset.inputGain);
    if (preset.masterVolume !== undefined) handleMasterVolumeChange(preset.masterVolume);
    if (preset.cabinet) {
      handleUpdateCabinetSettings(preset.cabinet);
    }
    if (preset.ampHead) {
      handleUpdateAmpHeadSettings(preset.ampHead);
    }
  }, [handleInputGainChange, handleMasterVolumeChange, handleUpdateCabinetSettings, handleUpdateAmpHeadSettings]);

  // Overwrite the currently active user preset with current rig settings
  const handleSaveCurrentPreset = useCallback((): boolean => {
    if (!currentPresetId) return false;
    const currentPreset = presets.find((p) => p.id === currentPresetId);
    if (!currentPreset) return false;

    let currentPositions = pedalPositions;
    if (!currentPositions || Object.keys(currentPositions).length === 0) {
      try {
        const saved = localStorage.getItem('web_guitar_pedal_coords');
        if (saved) currentPositions = JSON.parse(saved);
      } catch { }
    }

    let currentConns = patchConnections;
    if (!currentConns || currentConns.length === 0) {
      try {
        const saved = localStorage.getItem('web_guitar_patch_cables');
        if (saved) currentConns = JSON.parse(saved);
      } catch { }
    }

    saveUserPreset({
      id: currentPreset.id,
      name: currentPreset.name,
      pedals: JSON.parse(JSON.stringify(pedals)),
      pedalPositions: currentPositions,
      connections: currentConns,
      inputGain,
      masterVolume,
      cabinet: cabinetSettings,
      ampHead: ampHeadSettings,
    });

    const updated = loadAllPresets();
    setPresets(updated);
    return true;
  }, [currentPresetId, presets, pedalPositions, patchConnections, pedals, inputGain, masterVolume, cabinetSettings, ampHeadSettings]);

  // Save current rig settings as a brand new preset
  const handleSaveNewPreset = (name: string) => {
    let currentPositions = pedalPositions;
    if (!currentPositions || Object.keys(currentPositions).length === 0) {
      try {
        const saved = localStorage.getItem('web_guitar_pedal_coords');
        if (saved) currentPositions = JSON.parse(saved);
      } catch { }
    }

    let currentConns = patchConnections;
    if (!currentConns || currentConns.length === 0) {
      try {
        const saved = localStorage.getItem('web_guitar_patch_cables');
        if (saved) currentConns = JSON.parse(saved);
      } catch { }
    }

    const newPreset = saveUserPreset({
      id: `user-preset-${Date.now().toString(36)}`,
      name,
      pedals: JSON.parse(JSON.stringify(pedals)),
      pedalPositions: currentPositions,
      connections: currentConns,
      inputGain,
      masterVolume,
      cabinet: cabinetSettings,
      ampHead: ampHeadSettings,
    });
    const updated = loadAllPresets();
    setPresets(updated);
    setCurrentPresetId(newPreset.id);
  };

  // Rename an existing user preset
  const handleRenamePreset = (presetId: string, newName: string) => {
    const updated = renameUserPreset(presetId, newName);
    setPresets(updated);
  };

  const handleDeletePreset = (presetId: string) => {
    deleteUserPreset(presetId);
    const updated = loadAllPresets();
    setPresets(updated);
    if (currentPresetId === presetId) {
      if (updated.length > 0) {
        handleSelectPreset(updated[0]);
      } else {
        setCurrentPresetId(null);
      }
    }
  };

  const handleExportPresets = () => {
    exportPresetsToJson(presets);
  };

  const handleImportPresets = (imported: PresetSchema[]) => {
    for (const p of imported) {
      if (p.name && p.pedals) {
        saveUserPreset({
          id: p.id || `user-preset-${Date.now().toString(36)}`,
          name: p.name,
          description: p.description,
          pedals: p.pedals,
          pedalPositions: p.pedalPositions,
          connections: p.connections,
          inputGain: p.inputGain,
          masterVolume: p.masterVolume,
          cabinet: p.cabinet,
          ampHead: p.ampHead,
        });
      }
    }
    const updated = loadAllPresets();
    setPresets(updated);
    if (updated.length > 0) {
      handleSelectPreset(updated[updated.length - 1]);
    }
  };



  return (
    <div className="app-viewport">
      {/* Studio Top Bar - Minimalist with Section 2 Rig Preset */}
      <AudioHeader
        status={status}
        metrics={metrics}
        onTogglePower={handleTogglePower}
        isLoading={isLoading}
        presets={presets}
        currentPresetId={currentPresetId}
        onSelectPreset={handleSelectPreset}
        onSaveCurrentPreset={handleSaveCurrentPreset}
        onSaveNewPreset={handleSaveNewPreset}
        onRenamePreset={handleRenamePreset}
        onDeletePreset={handleDeletePreset}
        onExportPresets={handleExportPresets}
        onImportPresets={handleImportPresets}
      />

      <main className="dashboard-main-layout">
        {/* Left Column: Studio Configuration & Control Dashboard */}
        <aside className="dashboard-sidebar">
          {/* Headphone caution banner */}
          <HeadphoneWarning />

          {/* 1. Input Preamp & Device Selector */}
          <InputPreampPanel
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={handleDeviceChange}
            onRefreshDevices={handleRefreshDevices}
            isRefreshingDevices={isRefreshingDevices}
            inputGain={inputGain}
            onInputGainChange={handleInputGainChange}
            inputChannelMode={inputChannelMode}
            onInputChannelModeChange={handleInputChannelModeChange}
            noiseGateEnabled={noiseGateEnabled}
            noiseGateThreshold={noiseGateThreshold}
            onNoiseGateChange={handleNoiseGateChange}
            inputMeter={inputMeter}
            isEngineRunning={status === 'running'}
          />

          {/* 2. Precision Chromatic Tuner (Tapped directly from clean input) */}
          <ChromaticTuner
            tunerResult={tunerResult}
            isEngineRunning={status === 'running'}
            enabled={tunerEnabled}
            onToggleEnabled={handleToggleTuner}
          />

          {/* 3. Guitar Amp Head (Positioned after pedalboard & before cabinet IR) */}
          <AmpHeadPanel
            settings={ampHeadSettings}
            onUpdateSettings={handleUpdateAmpHeadSettings}
          />

          {/* 4. Dedicated Cabinet IR Simulator (Positioned after amp head) */}
          <CabinetSimulatorPanel
            settings={cabinetSettings}
            onUpdateSettings={handleUpdateCabinetSettings}
            onLoadCustomIR={handleLoadCustomCabinetIR}
          />

          {/* 5. Master Output Stage & Safety Limiter */}
          <MasterOutputPanel
            outputDevices={outputDevices}
            selectedOutputDeviceId={selectedOutputDeviceId}
            onSelectOutputDevice={handleOutputDeviceChange}
            onRefreshDevices={handleRefreshDevices}
            isRefreshingDevices={isRefreshingDevices}
            isOutputSelectionSupported={isOutputSelectionSupported}
            masterVolume={masterVolume}
            onMasterVolumeChange={handleMasterVolumeChange}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            outputMeter={outputMeter}
            isEngineRunning={status === 'running'}
          />
        </aside>

        {/* Right Column: Virtual Pedalboard Free Canvas Stage */}
        <section className="dashboard-canvas-stage">
          <Pedalboard
            pedals={pedals}
            positions={pedalPositions}
            onPositionsChange={setPedalPositions}
            connections={patchConnections}
            onConnectionsChange={setPatchConnections}
            onToggleEnabled={handleTogglePedalEnabled}
            onChangeParam={handleChangePedalParam}
            onRemovePedal={handleRemovePedal}
            onMovePedal={handleMovePedal}
            onAddPedal={handleAddPedal}
            onActiveChainChange={handleActiveChainChange}
            isEngineRunning={status === 'running'}
          />
        </section>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <span><strong>PeaceAmp</strong> — Real-Time Analog Modeling Guitar Processor</span>
          <div className="footer-right-actions">
            <span className="footer-tech-note">Zero-Latency Web Audio DSP • Classic Studio Edition</span>
            <button
              className="footer-manual-btn"
              onClick={() => setShowManualModal(true)}
              title="Open PeaceAmp Studio Manual & User Guide"
            >
              <BookOpen size={11} />
              <span>MANUAL BOOK</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Studio Manual Book Dialog Modal */}
      <ManualModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
      />

      {/* Floating Audio Error Toast with Auto-Dismiss & Close Button */}
      {errorMessage && (
        <div className="audio-toast-container" role="alert">
          <div className="audio-toast-card">
            <AlertOctagon size={18} className="audio-toast-icon" />
            <div className="audio-toast-content">
              <span className="audio-toast-title">Audio Notice</span>
              <p className="audio-toast-desc">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="audio-toast-close"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
      {/* Mobile & Tablet Desktop-Only Screen Blocker */}
      <DesktopOnlyBlocker />
    </div>
  );
}

export default App;
