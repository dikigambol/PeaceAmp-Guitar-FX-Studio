import React from 'react';
import type { MeterData } from '../../types/audio';

interface VuMeterProps {
  label: string;
  meterData: MeterData;
  isActive: boolean;
}

export const VuMeter: React.FC<VuMeterProps> = ({ label, meterData, isActive }) => {
  // Convert dB (-60 to 0) to percentage (0% to 100%)
  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 0) return 100;
    return Math.min(100, Math.max(0, ((db + 60) / 60) * 100));
  };

  const currentPercent = isActive ? dbToPercent(meterData.peakDb) : 0;
  const peakHoldPercent = isActive ? dbToPercent(meterData.peakHoldDb) : 0;
  const displayDb = isActive && meterData.peakDb > -90 
    ? `${meterData.peakDb.toFixed(1)} dB` 
    : '-∞ dB';

  return (
    <div className="vu-meter-card">
      <div className="vu-meter-header">
        <span className="vu-meter-title">{label}</span>
        <div className="vu-meter-meta">
          <span className={`vu-clip-badge ${meterData.clipHold ? 'active' : ''}`}>
            CLIP
          </span>
          <span className="vu-db-readout">{displayDb}</span>
        </div>
      </div>

      <div className="vu-meter-bar-container">
        {/* Background graduation markings */}
        <div className="vu-ticks">
          <span style={{ left: '0%' }}>-60</span>
          <span style={{ left: '40%' }}>-36</span>
          <span style={{ left: '70%' }}>-18</span>
          <span style={{ left: '85%' }}>-6</span>
          <span style={{ left: '98%' }}>0</span>
        </div>

        <div className="vu-track">
          {/* Active Signal Level */}
          <div 
            className="vu-fill" 
            style={{ width: `${currentPercent}%` }}
          />

          {/* Peak Hold Line */}
          {peakHoldPercent > 1 && (
            <div 
              className="vu-peak-hold" 
              style={{ left: `${peakHoldPercent}%` }} 
            />
          )}
        </div>
      </div>
    </div>
  );
};
