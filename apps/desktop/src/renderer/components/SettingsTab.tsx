import React from 'react';
import type { OrbitConfig, DisplayTarget } from '../../../../../packages/protocol/src/types.ts';

interface SettingsTabProps {
  config: OrbitConfig;
  displays: DisplayTarget[];
  onUpdateConfig: (partial: Partial<OrbitConfig>) => void;
  onResetDefaults: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  displays,
  onUpdateConfig,
  onResetDefaults,
}) => {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Hardware & Display Selection */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)] mb-4">
          Hardware & Display Configuration
        </h2>

        <div className="grid grid-cols-2 gap-5">
          {/* Display Target */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="display-select" className="text-xs font-medium text-[var(--text-secondary)]">Target Display Monitor</label>
            <select
              id="display-select"
              value={config.targetDisplayId}
              onChange={(e) => onUpdateConfig({ targetDisplayId: e.target.value })}
              className="bg-[#0c0f12] border border-[var(--border-subtle)] rounded p-2 text-xs text-[var(--text-primary)]"
            >
              {displays.length > 0 ? (
                displays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.width}x{d.height}) {d.primary ? '[Primary]' : ''}
                  </option>
                ))
              ) : (
                <option value="primary">Primary Display (Default)</option>
              )}
            </select>
            <span className="text-[10px] text-[var(--text-muted)]">
              Calibrated pointer tracking maps directly to this physical display.
            </span>
          </div>

          {/* Camera Index */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="camera-select" className="text-xs font-medium text-[var(--text-secondary)]">Webcam Device Index</label>
            <select
              id="camera-select"
              value={config.cameraIndex}
              onChange={(e) => onUpdateConfig({ cameraIndex: parseInt(e.target.value, 10) })}
              className="bg-[#0c0f12] border border-[var(--border-subtle)] rounded p-2 text-xs text-[var(--text-primary)]"
            >
              <option value={0}>Camera 0: Integrated / HD User Facing</option>
              <option value={1}>Camera 1: External USB Device</option>
              <option value={2}>Camera 2: Auxiliary Device</option>
            </select>
            <span className="text-[10px] text-[var(--text-muted)]">DirectShow capture backend on Windows 11.</span>
          </div>

          {/* Handedness */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="handedness-select" className="text-xs font-medium text-[var(--text-secondary)]">Preferred Hand</label>
            <select
              id="handedness-select"
              value={config.handedness}
              onChange={(e) => onUpdateConfig({ handedness: e.target.value as 'Right' | 'Left' })}
              className="bg-[#0c0f12] border border-[var(--border-subtle)] rounded p-2 text-xs text-[var(--text-primary)]"
            >
              <option value="Right">Right Hand</option>
              <option value="Left">Left Hand</option>
            </select>
            <span className="text-[10px] text-[var(--text-muted)]">Optimizes landmark orientation and pinch filtering.</span>
          </div>

          {/* Emergency Stop Shortcut */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="emergency-shortcut-input" className="text-xs font-medium text-[var(--text-secondary)]">Global Emergency Stop Shortcut</label>
            <input
              id="emergency-shortcut-input"
              type="text"
              readOnly
              value={config.emergencyShortcut}
              className="bg-[#0c0f12] border border-[var(--border-subtle)] rounded p-2 text-xs font-mono text-[var(--text-primary)]"
            />
            <span className="text-[10px] text-[var(--text-muted)]">Registered globally in Windows; instantly releases held buttons.</span>
          </div>
        </div>
      </section>

      {/* Voice Control & Allowlist Integration */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)] mb-2">
          Voice Control Baseline & Allowlisted Commands
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          FROSTEX ORBIT integrates with Windows 11 Voice Access as the native baseline. Custom voice execution is strictly limited to 5 reviewed operational shortcuts. Arbitrary shell execution is forbidden.
        </p>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded">
            <div className="font-semibold text-[var(--text-primary)]">&quot;Pause ORBIT&quot;</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Disarms synthetic input immediately.</div>
          </div>
          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded">
            <div className="font-semibold text-[var(--text-primary)]">&quot;Open ORBIT Settings&quot;</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Brings HUD window to the foreground.</div>
          </div>
          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded">
            <div className="font-semibold text-[var(--text-primary)]">&quot;Center Pointer&quot;</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Snaps cursor to screen center.</div>
          </div>
          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded">
            <div className="font-semibold text-[var(--text-primary)]">&quot;Power Down ORBIT&quot;</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Closes camera and enters OFF mode.</div>
          </div>
        </div>
      </section>

      {/* Advanced Sensory Expansion Cards */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)] mb-2">
          Modular Sensor Foundations
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Truthful hardware compatibility audit for optional future inputs.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {/* Head Pose */}
          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Head Pose Tracking</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Webcam face landmark orientation. Coarse navigation experiment.
              </div>
            </div>
            <div className="mt-3 px-2 py-0.5 text-[10px] font-mono bg-[#1a2129] text-[var(--text-muted)] rounded text-center">
              DISABLED BY DEFAULT
            </div>
          </div>

          {/* Dedicated Eye Tracking */}
          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Dedicated Eye Tracking</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Requires infrared tracker hardware (e.g. Tobii Eye Tracker 5). Generic webcams unsupported for pixel-gaze.
              </div>
            </div>
            <div className="mt-3 px-2 py-0.5 text-[10px] font-mono bg-[#1a2129] text-[#faad14] rounded text-center">
              HARDWARE REQUIRED
            </div>
          </div>

          {/* BCI / EEG */}
          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">BCI / Neural Interface</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Non-invasive research notes only. Low-risk confirmed selections; zero thought-reading claims.
              </div>
            </div>
            <div className="mt-3 px-2 py-0.5 text-[10px] font-mono bg-[#1a2129] text-[var(--text-muted)] rounded text-center">
              RESEARCH SPEC ONLY
            </div>
          </div>
        </div>
      </section>

      {/* Local Persistence & Reset Actions */}
      <div className="flex justify-between items-center p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
        <div className="text-xs text-[var(--text-secondary)]">
          Configuration file stored locally in user data directory. Zero telemetry or cloud sync.
        </div>
        <button
          onClick={onResetDefaults}
          className="px-3 py-1.5 bg-[#ff4d4f]/15 hover:bg-[#ff4d4f]/25 text-[#ff4d4f] border border-[#ff4d4f]/30 rounded text-xs font-medium transition-colors"
        >
          Reset All Settings to Defaults
        </button>
      </div>
    </div>
  );
};
