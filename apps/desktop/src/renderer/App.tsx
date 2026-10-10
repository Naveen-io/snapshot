import React, { useState, useEffect } from 'react';
import { TopHudBar } from './components/TopHudBar.tsx';
import { DashboardTab } from './components/DashboardTab.tsx';
import { CameraVisualizerTab } from './components/CameraVisualizerTab.tsx';
import { CalibrationTab } from './components/CalibrationTab.tsx';
import { PracticeTab } from './components/PracticeTab.tsx';
import { SettingsTab } from './components/SettingsTab.tsx';
import { AboutTab } from './components/AboutTab.tsx';

import type {
  OrbitMode,
  CameraStatus,
  LandmarkPoint,
  OrbitConfig,
  DisplayTarget,
  CalibrationData,
  GestureMessage,
  CalibrationCorner,
} from '../../../../packages/protocol/src/types.ts';
import { DEFAULT_ORBIT_CONFIG } from '../../../../packages/protocol/src/types.ts';

declare global {
  interface Window {
    orbitApi?: {
      getState: () => Promise<any>;
      setMode: (mode: string) => Promise<{ success: boolean; reason?: string }>;
      emergencyStop: () => Promise<void>;
      updateConfig: (config: any) => Promise<void>;
      calibratePoint: (corner: string, x: number, y: number) => Promise<void>;
      resetCalibration: () => Promise<void>;
      getDisplays: () => Promise<DisplayTarget[]>;
      onStatusUpdate: (cb: (status: any) => void) => () => void;
      onLandmarksUpdate: (cb: (landmarks: any) => void) => () => void;
      onPointerUpdate: (cb: (pointer: any) => void) => () => void;
      onGestureUpdate: (cb: (gesture: any) => void) => () => void;
      onSafetyRelease: (cb: (release: any) => void) => () => void;
    };
  }
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mode, setMode] = useState<OrbitMode>('OFF');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('closed');
  const [fps, setFps] = useState<number>(0.0);
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0.0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([]);
  const [pointerX, setPointerX] = useState<number>(0.5);
  const [pointerY, setPointerY] = useState<number>(0.5);
  const [lastGesture, setLastGesture] = useState<GestureMessage | null>(null);
  const [heldButtons, setHeldButtons] = useState<string[]>([]);

  const [config, setConfig] = useState<OrbitConfig>(DEFAULT_ORBIT_CONFIG);
  const [displays, setDisplays] = useState<DisplayTarget[]>([]);
  const [calibrationData, setCalibrationData] = useState<CalibrationData>({
    displayId: 'primary',
    bounds: { xMin: 0.15, yMin: 0.15, xMax: 0.85, yMax: 0.85 },
    points: {
      top_left: { x: 0.15, y: 0.15 },
      top_right: { x: 0.85, y: 0.15 },
      bottom_left: { x: 0.15, y: 0.85 },
      bottom_right: { x: 0.85, y: 0.85 },
    },
  });

  useEffect(() => {
    if (!window.orbitApi) {
      console.warn('window.orbitApi not available in standalone preview');
      return;
    }

    // Load initial state
    window.orbitApi.getState().then((state) => {
      if (state) {
        if (state.mode) setMode(state.mode);
        if (state.camera) setCameraStatus(state.camera);
        if (state.config) setConfig(state.config);
        if (state.calibration) setCalibrationData(state.calibration);
      }
    });

    window.orbitApi.getDisplays().then((d) => {
      if (d) setDisplays(d);
    });

    const unsubs = [
      window.orbitApi.onStatusUpdate((s) => {
        if (s.mode) setMode(s.mode);
        if (s.camera) setCameraStatus(s.camera);
        if (s.fps !== undefined) setFps(s.fps);
        if (s.handDetected !== undefined) setHandDetected(s.handDetected);
        if (s.message !== undefined) setErrorMessage(s.message);
      }),

      window.orbitApi.onLandmarksUpdate((l) => {
        if (l.landmarks) setLandmarks(l.landmarks);
        if (l.confidence !== undefined) setConfidence(l.confidence);
      }),

      window.orbitApi.onPointerUpdate((p) => {
        if (p.x !== undefined) setPointerX(p.x);
        if (p.y !== undefined) setPointerY(p.y);
      }),

      window.orbitApi.onGestureUpdate((g) => {
        setLastGesture(g);
        if (g.name === 'pinch_left') {
          if (g.phase === 'start') setHeldButtons(['left']);
          else if (g.phase === 'end') setHeldButtons([]);
        } else if (g.name === 'pinch_right') {
          if (g.phase === 'start') setHeldButtons(['right']);
          else if (g.phase === 'end') setHeldButtons([]);
        }
      }),

      window.orbitApi.onSafetyRelease(() => {
        setHeldButtons([]);
      }),
    ];

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  const handleSetMode = async (target: OrbitMode) => {
    if (window.orbitApi) {
      const res = await window.orbitApi.setMode(target);
      if (!res.success && res.reason) {
        setErrorMessage(res.reason);
      }
    } else {
      setMode(target);
    }
  };

  const handleEmergencyStop = async () => {
    if (window.orbitApi) {
      await window.orbitApi.emergencyStop();
    } else {
      setMode('PAUSED');
      setHeldButtons([]);
    }
  };

  const handleUpdateConfig = async (partial: Partial<OrbitConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    if (window.orbitApi) {
      await window.orbitApi.updateConfig(updated);
    }
  };

  const handleCalibratePoint = async (corner: CalibrationCorner, x: number, y: number) => {
    const updated = {
      ...calibrationData,
      points: {
        ...calibrationData.points,
        [corner]: { x, y },
      },
    };
    setCalibrationData(updated);
    if (window.orbitApi) {
      await window.orbitApi.calibratePoint(corner, x, y);
    }
  };

  const handleResetCalibration = async () => {
    if (window.orbitApi) {
      await window.orbitApi.resetCalibration();
    }
    setCalibrationData({
      displayId: 'primary',
      bounds: { xMin: 0.15, yMin: 0.15, xMax: 0.85, yMax: 0.85 },
      points: {
        top_left: { x: 0.15, y: 0.15 },
        top_right: { x: 0.85, y: 0.15 },
        bottom_left: { x: 0.15, y: 0.85 },
        bottom_right: { x: 0.85, y: 0.85 },
      },
    });
  };

  const handleResetDefaults = async () => {
    handleUpdateConfig(DEFAULT_ORBIT_CONFIG);
    handleResetCalibration();
  };

  const targetDisplayName = displays.find((d) => d.id === config.targetDisplayId)?.name || 'DISPLAY1';

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Top HUD Bar */}
      <TopHudBar
        mode={mode}
        cameraStatus={cameraStatus}
        fps={fps}
        targetDisplay={targetDisplayName}
        onEmergencyStop={handleEmergencyStop}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-[#ff4d4f]/20 border-b border-[#ff4d4f]/40 px-4 py-2 text-xs flex justify-between items-center text-[#ff7875]">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[10px] uppercase font-bold text-white hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <nav className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4">
        {[
          { id: 'dashboard', label: 'Control Deck' },
          { id: 'camera', label: 'Landmark Preview' },
          { id: 'calibration', label: 'Display Calibration' },
          { id: 'practice', label: 'Gesture Practice' },
          { id: 'settings', label: 'Settings & Sensors' },
          { id: 'about', label: 'System & Privacy' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold tracking-wide border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content Viewport */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <DashboardTab
            mode={mode}
            cameraStatus={cameraStatus}
            handDetected={handDetected}
            confidence={confidence}
            heldButtons={heldButtons}
            config={config}
            onSetMode={handleSetMode}
            onUpdateConfig={handleUpdateConfig}
            onSwitchTab={setActiveTab}
          />
        )}

        {activeTab === 'camera' && (
          <CameraVisualizerTab
            cameraStatus={cameraStatus}
            landmarks={landmarks}
            handDetected={handDetected}
            confidence={confidence}
            fps={fps}
            onToggleCamera={() => handleSetMode(mode === 'OFF' ? 'PREVIEW' : 'OFF')}
          />
        )}

        {activeTab === 'calibration' && (
          <CalibrationTab
            currentPointerX={pointerX}
            currentPointerY={pointerY}
            calibrationData={calibrationData}
            onCalibratePoint={handleCalibratePoint}
            onResetCalibration={handleResetCalibration}
            onStartPointerMode={() => handleSetMode('POINTER')}
          />
        )}

        {activeTab === 'practice' && <PracticeTab lastGesture={lastGesture} />}

        {activeTab === 'settings' && (
          <SettingsTab
            config={config}
            displays={displays}
            onUpdateConfig={handleUpdateConfig}
            onResetDefaults={handleResetDefaults}
          />
        )}

        {activeTab === 'about' && <AboutTab />}
      </main>
    </div>
  );
};

export default App;
