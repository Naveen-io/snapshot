import React, { useState, useEffect } from 'react';
import type { GestureMessage } from '../../../../../packages/protocol/src/types.ts';

interface PracticeTabProps {
  lastGesture: GestureMessage | null;
}

export const PracticeTab: React.FC<PracticeTabProps> = ({ lastGesture }) => {
  const [clickCount, setClickCount] = useState(0);
  const [rightClickCount, setRightClickCount] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(100);
  const [activeGesture, setActiveGesture] = useState<string>('None');

  useEffect(() => {
    if (!lastGesture) return;

    if (lastGesture.name === 'pinch_left' && lastGesture.phase === 'start') {
      setClickCount((c) => c + 1);
      setActiveGesture('Left Pinch (Click)');
      setTimeout(() => setActiveGesture('None'), 600);
    } else if (lastGesture.name === 'pinch_right' && lastGesture.phase === 'start') {
      setRightClickCount((c) => c + 1);
      setActiveGesture('Right Pinch (Context Menu)');
      setTimeout(() => setActiveGesture('None'), 600);
    } else if (lastGesture.name === 'scroll' && lastGesture.phase === 'update' && lastGesture.value) {
      setScrollPosition((pos) => Math.max(0, Math.min(200, pos + lastGesture.value!)));
      setActiveGesture('Scroll Active');
      setTimeout(() => setActiveGesture('None'), 300);
    }
  }, [lastGesture]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--accent-cyan)] uppercase tracking-wider">
              Gesture Practice Arena
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Practice gesture mechanics safely. OS mouse events are strictly disarmed during practice.
            </p>
          </div>
          <div className="px-3 py-1 bg-[#0c0f12] border border-[var(--border-subtle)] rounded text-xs font-mono">
            Active: <span className="text-[var(--accent-cyan)] font-bold">{activeGesture}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Module 1: Left Click */}
          <div className="p-4 bg-[#0c0f12] border border-[var(--border-subtle)] rounded flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">1. Left Click (Pinch)</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                Pinch thumb and index fingertip together and release. Emits strictly 1 click on pinch down.
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <div
                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${
                  activeGesture === 'Left Pinch (Click)'
                    ? 'border-[#00e5ff] bg-[#00e5ff]/20 scale-105 shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                    : 'border-[var(--border-subtle)] bg-[#14191f]'
                }`}
              >
                <span className="text-xl font-bold font-mono text-[var(--text-primary)]">{clickCount}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] mt-2">Pinch Count</span>
            </div>
          </div>

          {/* Module 2: Right Click */}
          <div className="p-4 bg-[#0c0f12] border border-[var(--border-subtle)] rounded flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">2. Right Click (Middle Pinch)</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                Pinch thumb and middle finger with index extended. Requires distinct finger separation.
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <div
                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${
                  activeGesture === 'Right Pinch (Context Menu)'
                    ? 'border-[#52c41a] bg-[#52c41a]/20 scale-105 shadow-[0_0_15px_rgba(82,196,26,0.4)]'
                    : 'border-[var(--border-subtle)] bg-[#14191f]'
                }`}
              >
                <span className="text-xl font-bold font-mono text-[var(--text-primary)]">{rightClickCount}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] mt-2">Right Clicks</span>
            </div>
          </div>

          {/* Module 3: Scroll */}
          <div className="p-4 bg-[#0c0f12] border border-[var(--border-subtle)] rounded flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">3. Two-Finger Scroll</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                Extend index + middle fingers (peace sign), fold ring and pinky. Move hand up/down to scroll.
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <div className="w-full h-20 bg-[#14191f] border border-[var(--border-subtle)] rounded relative overflow-hidden flex items-center justify-center">
                <div
                  className="absolute w-full h-2 bg-[var(--accent-cyan)] transition-all duration-75"
                  style={{ top: `${(scrollPosition / 200) * 100}%` }}
                />
                <span className="text-xs font-mono text-[var(--text-secondary)] z-10">
                  Scroll: {Math.round(scrollPosition)}
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] mt-2">Vertical Meter</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-[#0c0f12] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-secondary)]">
          <strong>Practice Guidance:</strong> Keep your hand at chest height, roughly 40-70 cm from your webcam. Avoid bright backlighting directly behind you for optimal tracking stability.
        </div>
      </div>
    </div>
  );
};
