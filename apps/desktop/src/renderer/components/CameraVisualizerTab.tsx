import React, { useEffect, useRef } from 'react';
import type { LandmarkPoint, CameraStatus } from '../../../../../packages/protocol/src/types.ts';

interface CameraVisualizerTabProps {
  cameraStatus: CameraStatus;
  landmarks: LandmarkPoint[];
  handDetected: boolean;
  confidence: number;
  fps: number;
  onToggleCamera: () => void;
}

const HAND_CONNECTIONS = [
  // Palm base
  [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20],
];

export const CameraVisualizerTab: React.FC<CameraVisualizerTabProps> = ({
  cameraStatus,
  landmarks,
  handDetected,
  confidence,
  fps,
  onToggleCamera,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0c0f12';
    ctx.fillRect(0, 0, width, height);

    // Subtle alignment grid
    ctx.strokeStyle = '#161c24';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!handDetected || landmarks.length !== 21) {
      // Empty state
      ctx.fillStyle = '#6e7681';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        cameraStatus === 'active'
          ? 'HOLD HAND IN CAMERA VIEW'
          : 'CAMERA HARDWARE CLOSED — START PREVIEW TO INITIALIZE',
        width / 2,
        height / 2
      );
      return;
    }

    // Mirror horizontal for selfie preview
    const project = (pt: LandmarkPoint) => ({
      x: (1.0 - pt.x) * width,
      y: pt.y * height,
    });

    // Draw bones
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const p1 = project(landmarks[startIdx]);
      const p2 = project(landmarks[endIdx]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw landmark joints
    for (let i = 0; i < landmarks.length; i++) {
      const p = project(landmarks[i]);
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const isIndexTip = i === 8;

      ctx.beginPath();
      ctx.arc(p.x, p.y, isIndexTip ? 6 : isTip ? 4.5 : 3, 0, Math.PI * 2);

      if (isIndexTip) {
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crosshair reticle around index tip
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      } else if (isTip) {
        ctx.fillStyle = '#52c41a';
        ctx.fill();
      } else {
        ctx.fillStyle = '#8b949e';
        ctx.fill();
      }
    }
  }, [landmarks, handDetected, cameraStatus]);

  return (
    <div className="flex flex-col items-center gap-4 p-5 max-w-4xl mx-auto">
      <div className="flex justify-between items-center w-full max-w-[640px]">
        <div>
          <h2 className="text-sm font-bold text-[var(--accent-cyan)] uppercase tracking-wider">
            Live Hand Landmark Skeleton Visualizer
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Local real-time computer vision inference. No video is recorded or stored.
          </p>
        </div>
        <button
          onClick={onToggleCamera}
          className="px-3 py-1.5 bg-[#1a2129] hover:bg-[#222c38] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-xs font-medium"
        >
          {cameraStatus === 'active' ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>

      {/* Responsive Canvas Frame */}
      <div className="relative border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[#0c0f12] shadow-2xl">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="block w-full max-w-[640px] h-auto"
        />

        {/* Telemetry HUD Overlay */}
        <div className="absolute top-3 left-3 bg-[#0c0f12]/80 backdrop-blur-sm border border-[var(--border-subtle)] rounded px-2.5 py-1 text-[11px] font-mono text-[var(--text-secondary)] flex gap-4">
          <span>FPS: <strong className="text-[var(--accent-cyan)]">{fps.toFixed(1)}</strong></span>
          <span>RESOLUTION: <strong className="text-[var(--text-primary)]">640x480</strong></span>
          <span>CONFIDENCE: <strong className="text-[var(--text-primary)]">{(confidence * 100).toFixed(0)}%</strong></span>
        </div>
      </div>
    </div>
  );
};
