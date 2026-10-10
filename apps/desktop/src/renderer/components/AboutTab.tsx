import React from 'react';

export const AboutTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5">
        <div className="flex items-baseline gap-2 mb-2">
          <h2 className="text-base font-bold text-[var(--accent-cyan)] uppercase tracking-wider">
            FROSTEX ORBIT
          </h2>
          <span className="text-xs font-mono text-[var(--text-secondary)]">Version 0.1.0 MVP</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          A local-first Windows 11 spatial desktop control interface inspired by futuristic suit computing. Designed for reliable, high-agency personal control with index-finger pointer navigation, natural pinch gestures, two-finger scrolling, and comprehensive fail-closed safety safeguards.
        </p>

        {/* 5 Core Principles */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded">
            <div className="font-semibold text-[var(--accent-cyan)]">1. Local-First Privacy</div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-1">
              Zero frames or audio saved or uploaded. Camera is OFF by default and starts only upon explicit action.
            </div>
          </div>

          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded">
            <div className="font-semibold text-[var(--accent-cyan)]">2. Single State Machine Gate</div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-1">
              Only the policy gate authorizes OS mouse injection. Preview and Calibration emit zero system inputs.
            </div>
          </div>

          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded">
            <div className="font-semibold text-[var(--accent-cyan)]">3. Fail-Closed Button Release</div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-1">
              Hand loss (&gt;300ms), camera disconnect, pause, or crash instantly releases all synthetic mouse buttons.
            </div>
          </div>

          <div className="p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded">
            <div className="font-semibold text-[var(--accent-cyan)]">4. Physical Priority Always</div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-1">
              Physical mouse and keyboard always take precedence. Global shortcut Ctrl+Alt+Backspace stops input immediately.
            </div>
          </div>
        </div>

        {/* Verified Environment */}
        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-2">
            Verified Host Environment
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[var(--text-secondary)] bg-[#0c0f12] p-3 rounded border border-[var(--border-subtle)]">
            <div>OS: Windows 11 Pro 64-bit (Build 26300)</div>
            <div>CPU: Intel Core i5-11400H @ 2.70GHz</div>
            <div>GPU: NVIDIA GeForce GTX 1650 + Intel UHD</div>
            <div>RAM: 16 GB Physical Memory</div>
            <div>Camera: HD User Facing Webcam (0408:a061)</div>
            <div>Displays: DISPLAY1 (1536x864 Primary), DISPLAY5 (1440x900)</div>
          </div>
        </div>

        <div className="mt-4 text-[10px] text-[var(--text-muted)]">
          FROSTEX ORBIT is licensed under the MIT License. Built with Electron, React 19, Vite, OpenCV, and Google MediaPipe Hand Landmarker. Original interface design.
        </div>
      </div>
    </div>
  );
};
