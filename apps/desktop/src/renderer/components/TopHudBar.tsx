import React from 'react';
import type { OrbitMode, CameraStatus } from '../../../../../packages/protocol/src/types.ts';

interface TopHudBarProps {
  mode: OrbitMode;
  cameraStatus: CameraStatus;
  fps: number;
  targetDisplay: string;
  onEmergencyStop: () => void;
}

export const TopHudBar: React.FC<TopHudBarProps> = ({
  mode,
  cameraStatus,
  fps,
  targetDisplay,
  onEmergencyStop,
}) => {
  const getModeColor = (m: OrbitMode) => {
    switch (m) {
      case 'POINTER':
        return 'bg-[#52c41a] text-black font-semibold';
      case 'PREVIEW':
        return 'bg-[var(--accent-cyan)] text-black font-semibold';
      case 'CALIBRATION':
        return 'bg-[#faad14] text-black font-semibold';
      case 'PAUSED':
        return 'bg-[#faad14] text-black font-semibold';
      case 'ERROR':
        return 'bg-[#ff4d4f] text-white font-semibold';
      case 'OFF':
      default:
        return 'bg-[#222c38] text-[#8b949e]';
    }
  };

  const getCameraColor = (status: CameraStatus) => {
    switch (status) {
      case 'active':
        return 'text-[var(--accent-cyan)] border-[var(--accent-cyan-border)]';
      case 'opening':
        return 'text-[#faad14] border-[#faad14]';
      case 'error':
        return 'text-[#ff4d4f] border-[#ff4d4f]';
      case 'closed':
      default:
        return 'text-[#6e7681] border-[#222c38]';
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wider text-[var(--accent-cyan)]">FROSTEX ORBIT</span>
          <span className="text-xs text-[var(--text-muted)]">v0.1</span>
        </div>

        {/* Mode Pill */}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-xs text-[var(--text-muted)]">MODE:</span>
          <span className={`px-2 py-0.5 text-xs rounded uppercase tracking-wide ${getModeColor(mode)}`}>
            {mode}
          </span>
        </div>

        {/* Camera Pill */}
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-xs text-[var(--text-muted)]">CAMERA:</span>
          <span className={`px-2 py-0.5 text-xs rounded border bg-[#0c0f12] font-mono uppercase ${getCameraColor(cameraStatus)}`}>
            {cameraStatus}
          </span>
        </div>

        {/* Truthful Measured FPS */}
        <div className="flex items-center gap-1.5 ml-1 font-mono text-xs">
          <span className="text-[var(--text-muted)]">INFERENCE:</span>
          <span className="text-[var(--text-primary)] font-medium">
            {fps > 0 ? `${fps.toFixed(1)} FPS` : '0.0 FPS'}
          </span>
        </div>

        {/* Target Display */}
        <div className="flex items-center gap-1.5 ml-1 text-xs">
          <span className="text-[var(--text-muted)]">DISPLAY:</span>
          <span className="text-[var(--text-secondary)] font-mono">{targetDisplay}</span>
        </div>
      </div>

      {/* Emergency Stop Affordance */}
      <div className="flex items-center gap-2">
        <button
          onClick={onEmergencyStop}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff4d4f] hover:bg-[#ff7875] active:bg-[#d9363e] text-white text-xs font-bold rounded transition-colors shadow"
          title="Emergency Stop: Disarm all synthetic input immediately"
        >
          <span>EMERGENCY STOP</span>
          <span className="px-1 py-0.2 bg-black/30 rounded text-[10px] font-mono">Ctrl+Alt+Backspace</span>
        </button>
      </div>
    </header>
  );
};
