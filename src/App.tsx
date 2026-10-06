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
  deleteUserPreset,
  exportPresetsToJson,
} from './presets/presetStorage';
import { AudioHeader } from './components/AudioHeader';
import { InputPreampPanel } from './components/sidebar/InputPreampPanel';
import { ChromaticTuner } from './components/tuner/ChromaticTuner';
import { CabinetSimulatorPanel } from './components/sidebar/CabinetSimulatorPanel';
import { MasterOutputPanel } from './components/sidebar/MasterOutputPanel';
import { Pedalboard } from './components/pedalboard/Pedalboard';
import { HeadphoneWarning } from './components/HeadphoneWarning';
import { ManualModal } from './components/manual/ManualModal';
import { DesktopOnlyBlocker } from './components/common/DesktopOnlyBlocker';
import type { CabinetSettings } from './types/cabinet';
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

  // Dedicated Cabinet IR Simulator State
  const [cabinetSettings, setCabinetSettings] = useState<CabinetSettings>({
    enabled: true,
    model: '4x12-closed',
    mic: 'sm57',
    position: 0.8,
    mix: 1.0,
    level: 0,
  });

  // Tuner & Telemetry
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

    // Load available devices
    engine.getAudioDevices().then((devList) => {
      setDevices(devList);
      if (devList.length > 0) {
        setSelectedDeviceId((prev) => prev || devList[0].deviceId);
      }
    });

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

        // Run chromatic pitch detection every 3 frames (~20Hz refresh) to conserve CPU
        frameCount++;
        if (frameCount % 3 === 0) {
          const pitch = engineRef.current.detectTunerPitch();
          setTunerResult(pitch);
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
      const devList = await engineRef.current.getAudioDevices();
      setDevices(devList);
      if (devList.length > 0) {
        const activeId = engineRef.current.getSelectedInputId();
        if (activeId && devList.some((d) => d.deviceId === activeId)) {
          setSelectedDeviceId(activeId);
        } else if (!selectedDeviceId || !devList.some((d) => d.deviceId === selectedDeviceId)) {
          setSelectedDeviceId(devList[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
    }
  }, [selectedDeviceId]);

  const handleRefreshDevices = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      const devList = await engineRef.current.requestDeviceAccess();
      setDevices(devList);
      if (devList.length > 0) {
        const activeId = engineRef.current.getSelectedInputId();
        if (activeId && devList.some((d) => d.deviceId === activeId)) {
          setSelectedDeviceId(activeId);
        } else if (!selectedDeviceId || !devList.some((d) => d.deviceId === selectedDeviceId)) {
          setSelectedDeviceId(devList[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Failed to request device access:', err);
    }
  }, [selectedDeviceId]);

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
        await engineRef.current.start(selectedDeviceId || undefined);
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

    setPedals((prev) => {
      const next = [...prev, newInstance];
      engineRef.current?.setPedalInstances(next);
      return next;
    });
  }, []);

  const handleRemovePedal = (pedalId: string) => {
    setPedals((prev) => {
      const next = prev.filter((p) => p.id !== pedalId);
      engineRef.current?.setPedalInstances(next);
      return next;
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
    if (preset.inputGain !== undefined) handleInputGainChange(preset.inputGain);
    if (preset.masterVolume !== undefined) handleMasterVolumeChange(preset.masterVolume);
    if (preset.cabinet) {
      handleUpdateCabinetSettings(preset.cabinet);
    }
  }, [handleInputGainChange, handleMasterVolumeChange, handleUpdateCabinetSettings]);

  const handleSaveCurrentAsPreset = (name: string) => {
    const newPreset = saveUserPreset({
      id: `user-preset-${Date.now().toString(36)}`,
      name,
      pedals: JSON.parse(JSON.stringify(pedals)),
      inputGain,
      masterVolume,
      cabinet: cabinetSettings,
    });
    const updated = loadAllPresets();
    setPresets(updated);
    setCurrentPresetId(newPreset.id);
  };

  const handleDeletePreset = (presetId: string) => {
    deleteUserPreset(presetId);
    const updated = loadAllPresets();
    setPresets(updated);
    if (currentPresetId === presetId) {
      handleSelectPreset(updated[0]);
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
        onSaveCurrentAsPreset={handleSaveCurrentAsPreset}
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
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          {/* 3. Dedicated Cabinet IR Simulator (Positioned at the end of the signal chain) */}
          <CabinetSimulatorPanel
            settings={cabinetSettings}
            onUpdateSettings={handleUpdateCabinetSettings}
          />

          {/* 4. Master Output Stage & Safety Limiter */}
          <MasterOutputPanel
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
