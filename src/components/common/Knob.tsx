import React, { useRef, useState, useCallback, useEffect } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  formatValue?: (val: number) => string;
  onChange: (val: number) => void;
  disabled?: boolean;
  size?: number;
  color?: string;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  unit = '',
  formatValue,
  onChange,
  disabled = false,
  size = 56,
  color = 'var(--accent-glow, #38bdf8)',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartVal = useRef(0);

  // Map value to -135deg to +135deg
  const normalized = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = -135 + normalized * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartVal.current = value;
    document.body.style.cursor = 'ns-resize';
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || defaultValue === undefined) return;
    onChange(defaultValue);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = dragStartY.current - e.clientY;
      const range = max - min;
      // 150px drag for full range
      const stepDelta = (deltaY / 150) * range;
      let newVal = dragStartVal.current + stepDelta;
      newVal = Math.max(min, Math.min(max, newVal));

      if (step) {
        newVal = Math.round(newVal / step) * step;
      }
      onChange(newVal);
    },
    [isDragging, max, min, onChange, step]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const displayVal = formatValue ? formatValue(value) : `${value.toFixed(2)}${unit}`;

  return (
    <div className={`knob-container ${disabled ? 'disabled' : ''}`}>
      <span className="knob-label">{label}</span>
      <div
        className="knob-dial-wrapper"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title="Drag up/down to adjust. Double-click to reset."
      >
        <div 
          className="knob-dial"
          style={{
            transform: `rotate(${angle}deg)`,
            boxShadow: isDragging ? `0 0 12px ${color}` : undefined,
          }}
        >
          <div className="knob-indicator" style={{ backgroundColor: color }} />
        </div>
      </div>
      <span className="knob-value">{displayVal}</span>
    </div>
  );
};
