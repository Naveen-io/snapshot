import React from 'react';
import type { OrbitMode, CameraStatus, OrbitConfig } from '../../../../../packages/protocol/src/types.ts';

interface DashboardTabProps {
  mode: OrbitMode;
  cameraStatus: CameraStatus;
  handDetected: boolean;
  confidence: number;
  heldButtons: string[];
  config: OrbitConfig;
  onSetMode: (target: OrbitMode) => void;
  onUpdateConfig: (partial: Partial<OrbitConfig>) => void;
  onSwitchTab: (tab: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  mode,
  cameraStatus,
  handDetected,
  confidence,
  heldButtons,
  config,
  onSetMode,
  onUpdateConfig,
  onSwitchTab,
}) => {
  return (
    <div className="flex flex-col gap-5 p-5 max-w-5xl mx-auto">
      {/* Primary Mode Command Deck */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)] mb-4">
          Spatial Input Control State
        </h2>

        <div className="grid grid-cols-4 gap-3">
          {/* OFF */}
          <button
            onClick={() => onSetMode('OFF')}
            className={`p-4 rounded border text-left flex flex-col justify-between transition-all ${
              mode === 'OFF'
                ? 'bg-[#1a2129] border-[var(--text-muted)] ring-1 ring-[var(--text-muted)]'
                : 'bg-[#0c0f12] border-[var(--border-subtle)] hover:border-[var(--border-highlight)]'
            }`}
          >
            <div>
              <div className="text-sm font-bold text-[var(--text-primary)]">POWER OFF</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Camera hardware closed. Zero tracking.</div>
            </div>
            <div className="mt-4 text-[10px] font-mono uppercase text-[var(--text-muted)]">Default Safe State</div>
          </button>

          {/* PREVIEW */}
          <button
            onClick={() => onSetMode('PREVIEW')}
            className={`p-4 rounded border text-left flex flex-col justify-between transition-all ${
              mode === 'PREVIEW'
                ? 'bg-[var(--accent-cyan-dim)] border-[var(--accent-cyan)] ring-1 ring-[var(--accent-cyan)]'
                : 'bg-[#0c0f12] border-[var(--border-subtle)] hover:border-[var(--accent-cyan-border)]'
            }`}
          >
            <div>
              <div className="text-sm font-bold text-[var(--accent-cyan)]">CAMERA PREVIEW</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Live landmark skeleton. No OS mouse movement.</div>
            </div>
            <div className="mt-4 text-[10px] font-mono uppercase text-[var(--accent-cyan)]">Diagnostic Mode</div>
          </button>

          {/* POINTER */}
          <button
            onClick={() => onSetMode('POINTER')}
            className={`p-4 rounded border text-left flex flex-col justify-between transition-all ${
              mode === 'POINTER'
                ? 'bg-[#52c41a]/15 border-[#52c41a] ring-1 ring-[#52c41a]'
                : 'bg-[#0c0f12] border-[var(--border-subtle)] hover:border-[#52c41a]/50'
            }`}
          >
            <div>
              <div className="text-sm font-bold text-[#52c41a]">ARM POINTER</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Index fingertip drives Windows mouse cursor.</div>
            </div>
            <div className="mt-4 text-[10px] font-mono uppercase text-[#52c41a]">Active Control</div>
          </button>

          {/* PAUSED */}
          <button
            onClick={() => onSetMode('PAUSED')}
            className={`p-4 rounded border text-left flex flex-col justify-between transition-all ${
              mode === 'PAUSED'
                ? 'bg-[#faad14]/15 border-[#faad14] ring-1 ring-[#faad14]'
                : 'bg-[#0c0f12] border-[var(--border-subtle)] hover:border-[#faad14]/50'
            }`}
          >
            <div>
              <div className="text-sm font-bold text-[#faad14]">PAUSE CONTROL</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Synthetic input frozen. Camera remains standby.</div>
            </div>
            <div className="mt-4 text-[10px] font-mono uppercase text-[#faad14]">Suspended Input</div>
          </button>
        </div>
      </section>

      {/* Live Biometric & Safety State */}
      <section className="grid grid-cols-3 gap-4">
        {/* Hand Presence Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Hand Detection</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-xl font-bold font-mono ${handDetected ? 'text-[#52c41a]' : 'text-[#6e7681]'}`}>
              {handDetected ? 'TRACKING ACTIVE' : 'NO HAND DETECTED'}
            </span>
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            Handedness: <span className="font-mono text-[var(--text-primary)]">{config.handedness}</span> | Confidence:{' '}
            <span className="font-mono text-[var(--text-primary)]">{handDetected ? `${(confidence * 100).toFixed(0)}%` : '0%'}</span>
          </div>
        </div>

        {/* Synthetic Button Guard */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Synthetic Mouse Buttons</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-[var(--text-primary)]">
              {heldButtons.length > 0 ? heldButtons.join(', ').toUpperCase() : 'ALL RELEASED'}
            </span>
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            Fail-Closed Guard: <span className="text-[#52c41a] font-semibold">ACTIVE</span> (timeout &lt;300ms)
          </div>
        </div>

        {/* Quick Action Wizard Callouts */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Calibration & Training</span>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Ensure pointer reach matches your monitor geometry before enabling desktop control.
            </p>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onSwitchTab('calibration')}
              className="flex-1 px-3 py-1.5 bg-[#1a2129] hover:bg-[#222c38] text-[var(--accent-cyan)] border border-[var(--accent-cyan-border)] rounded text-xs font-medium"
            >
              Run Calibration
            </button>
            <button
              onClick={() => onSwitchTab('practice')}
              className="flex-1 px-3 py-1.5 bg-[#1a2129] hover:bg-[#222c38] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-xs font-medium"
            >
              Practice Gestures
            </button>
          </div>
        </div>
      </section>

      {/* Real-time Pointer Tuning Controls */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)] mb-4">
          Pointer Response & Jitter Tuning
        </h2>

        <div className="grid grid-cols-3 gap-6">
          {/* Sensitivity */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="sensitivity-input" className="text-[var(--text-secondary)]">Cursor Sensitivity</label>
              <span className="font-mono text-[var(--accent-cyan)]">{config.sensitivity.toFixed(2)}x</span>
            </div>
            <input
              id="sensitivity-input"
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={config.sensitivity}
              onChange={(e) => onUpdateConfig({ sensitivity: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent-cyan)] cursor-pointer"
            />
            <span className="text-[10px] text-[var(--text-muted)]">Higher values accelerate pointer reach across wide monitors.</span>
          </div>

          {/* Temporal Smoothing */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="smoothing-input" className="text-[var(--text-secondary)]">Temporal Smoothing</label>
              <span className="font-mono text-[var(--accent-cyan)]">{config.smoothingFactor.toFixed(2)}</span>
            </div>
            <input
              id="smoothing-input"
              type="range"
              min="0.2"
              max="0.85"
              step="0.05"
              value={config.smoothingFactor}
              onChange={(e) => onUpdateConfig({ smoothingFactor: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent-cyan)] cursor-pointer"
            />
            <span className="text-[10px] text-[var(--text-muted)]">Balances micro-tremor damping against flick response latency.</span>
          </div>

          {/* Deadzone */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="deadzone-input" className="text-[var(--text-secondary)]">Stillness Deadzone</label>
              <span className="font-mono text-[var(--accent-cyan)]">{(config.deadzone * 100).toFixed(1)}%</span>
            </div>
            <input
              id="deadzone-input"
              type="range"
              min="0.005"
              max="0.05"
              step="0.005"
              value={config.deadzone}
              onChange={(e) => onUpdateConfig({ deadzone: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent-cyan)] cursor-pointer"
            />
            <span className="text-[10px] text-[var(--text-muted)]">Locks cursor in place when hand is stationary to prevent drift.</span>
          </div>
        </div>
      </section>
    </div>
  );
};
