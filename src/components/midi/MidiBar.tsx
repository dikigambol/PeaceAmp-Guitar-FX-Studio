import React, { useEffect, useState } from 'react';
import { midiManager, type MidiDevice } from '../../midi/MidiManager';
import { Radio, Usb, Zap } from 'lucide-react';
import './MidiBar.css';

export const MidiBar: React.FC = () => {
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [isSupported] = useState<boolean>(() => midiManager.checkSupport());
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribeDevices = midiManager.onDevicesChange((devs) => {
      setDevices([...devs]);
    });

    const unsubscribeActivity = midiManager.onActivity((info) => {
      if (info.type === 'cc') {
        setLastActivity(`CC #${info.number} (${info.value})`);
      } else if (info.type === 'pc') {
        setLastActivity(`PC #${info.number}`);
      } else {
        setLastActivity(`Note #${info.number}`);
      }

      setIsBlinking(true);
      const timer = setTimeout(() => setIsBlinking(false), 120);
      return () => clearTimeout(timer);
    });

    return () => {
      unsubscribeDevices();
      unsubscribeActivity();
    };
  }, []);

  const handleConnectMidi = async () => {
    await midiManager.initialize();
  };

  if (!isSupported) {
    return null;
  }

  const isConnected = devices.length > 0;

  return (
    <div className="mini-card-module">
      {/* Module Title Header */}
      <div className="mini-module-header">
        <div className="mini-header-title">
          <Radio size={13} className="text-amber-500" />
          <span>USB MIDI CONTROLLER</span>
        </div>
        <div className={`mini-midi-status-chip ${isConnected ? 'connected' : ''}`}>
          <div className={`mini-midi-led ${isBlinking ? 'active' : isConnected ? 'connected' : ''}`} />
          <span>{isConnected ? `${devices.length} ONLINE` : 'DISCONNECTED'}</span>
        </div>
      </div>

      <div className="mini-module-body mini-midi-body">
        {/* Device Status & Connect Action Bar */}
        <div className="mini-midi-device-row">
          <div className="mini-midi-device-info">
            <Usb size={12} className={isConnected ? 'text-amber-500 shrink-0' : 'text-slate-500 shrink-0'} />
            <span
              className="mini-midi-device-name"
              title={isConnected ? devices.map((d) => d.name).join(', ') : 'No hardware controller detected'}
            >
              {isConnected ? devices.map((d) => d.name).join(', ') : 'No MIDI Hardware Detected'}
            </span>
          </div>

          {!isConnected ? (
            <button
              className="mini-midi-scan-btn"
              onClick={handleConnectMidi}
              title="Request browser Web MIDI access"
            >
              <Zap size={10} />
              <span>CONNECT</span>
            </button>
          ) : (
            lastActivity && (
              <span className="mini-midi-rx-tag" title="Last received MIDI message">
                RX {lastActivity}
              </span>
            )
          )}
        </div>

        {/* CC / PC Quick Mappings Grid */}
        <div className="mini-midi-mappings-grid">
          <div className="mini-midi-map-item" title="CC 1 to 8: Toggle Stompbox Pedals 1-8">
            <span className="mini-midi-map-key">CC 1-8</span>
            <span className="mini-midi-map-val">Pedals</span>
          </div>
          <div className="mini-midi-map-item" title="CC 64: Looper Footswitch (Record / Play / Overdub)">
            <span className="mini-midi-map-key">CC 64</span>
            <span className="mini-midi-map-val">Looper</span>
          </div>
          <div className="mini-midi-map-item" title="CC 7: Expression Pedal Master Volume">
            <span className="mini-midi-map-key">CC 7</span>
            <span className="mini-midi-map-val">Volume</span>
          </div>
          <div className="mini-midi-map-item" title="Program Change: Switch Rig Presets">
            <span className="mini-midi-map-key">PC</span>
            <span className="mini-midi-map-val">Presets</span>
          </div>
        </div>
      </div>
    </div>
  );
};
