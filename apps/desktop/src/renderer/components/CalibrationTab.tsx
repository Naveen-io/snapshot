import React, { useState } from 'react';
import type { CalibrationCorner, CalibrationData } from '../../../../../packages/protocol/src/types.ts';

interface CalibrationTabProps {
  currentPointerX: number;
  currentPointerY: number;
  calibrationData: CalibrationData;
  onCalibratePoint: (corner: CalibrationCorner, x: number, y: number) => void;
  onResetCalibration: () => void;
  onStartPointerMode: () => void;
}

const CORNER_STEPS: { id: CalibrationCorner; label: string; desc: string }[] = [
  { id: 'top_left', label: 'Top-Left Corner', desc: 'Point your index finger comfortably toward the top-left area of your monitor.' },
  { id: 'top_right', label: 'Top-Right Corner', desc: 'Point comfortably toward the top-right area of your monitor.' },
  { id: 'bottom_right', label: 'Bottom-Right Corner', desc: 'Point comfortably toward the bottom-right area of your monitor.' },
  { id: 'bottom_left', label: 'Bottom-Left Corner', desc: 'Point comfortably toward the bottom-left area of your monitor.' },
];

export const CalibrationTab: React.FC<CalibrationTabProps> = ({
  currentPointerX,
  currentPointerY,
  calibrationData,
  onCalibratePoint,
  onResetCalibration,
  onStartPointerMode,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const activeStep = CORNER_STEPS[currentStepIndex];

  const handleCapture = () => {
    onCalibratePoint(activeStep.id, currentPointerX, currentPointerY);
    if (currentStepIndex < CORNER_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5">
        <h2 className="text-sm font-bold text-[var(--accent-cyan)] uppercase tracking-wider">
          4-Point Display Calibration Wizard
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Calibrating maps your natural hand reach to your display screen. You do not need to reach the extreme edges of your camera frame; choose a comfortable working zone.
        </p>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {CORNER_STEPS.map((step, idx) => {
            const isRecorded = !!calibrationData.points[step.id];
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  isCurrent
                    ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan-dim)] text-[var(--text-primary)]'
                    : isRecorded
                    ? 'border-[#52c41a]/40 bg-[#0c0f12] text-[var(--text-secondary)]'
                    : 'border-[var(--border-subtle)] bg-[#0c0f12] text-[var(--text-muted)]'
                }`}
              >
                <div className="font-semibold">{idx + 1}. {step.label}</div>
                <div className="text-[10px] font-mono mt-1">
                  x: {calibrationData.points[step.id]?.x.toFixed(2) ?? '--'} y: {calibrationData.points[step.id]?.y.toFixed(2) ?? '--'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Instruction Box */}
        <div className="mt-5 p-4 bg-[#0c0f12] border border-[var(--border-subtle)] rounded flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              Step {currentStepIndex + 1}: {activeStep.label}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">{activeStep.desc}</div>
            <div className="text-xs font-mono text-[var(--accent-cyan)] mt-2">
              Live Fingertip Position: X={currentPointerX.toFixed(3)}, Y={currentPointerY.toFixed(3)}
            </div>
          </div>

          <button
            onClick={handleCapture}
            className="px-4 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan-hover)] text-black font-bold text-xs rounded shadow transition-colors"
          >
            Record Corner
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={onResetCalibration}
            className="px-3 py-1.5 bg-[#1a2129] hover:bg-[#222c38] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-xs"
          >
            Reset to Defaults
          </button>

          <button
            onClick={onStartPointerMode}
            className="px-4 py-2 bg-[#52c41a] hover:bg-[#73d13d] text-black font-bold text-xs rounded shadow transition-colors"
          >
            Save & Arm Pointer Mode
          </button>
        </div>
      </div>
    </div>
  );
};
