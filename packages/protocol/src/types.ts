export const PROTOCOL_VERSION = 1;

export type OrbitMode = 'OFF' | 'PREVIEW' | 'CALIBRATION' | 'POINTER' | 'PAUSED' | 'ERROR';

export type CameraStatus = 'closed' | 'opening' | 'active' | 'error';

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface StatusMessage {
  version: 1;
  type: 'status';
  camera: CameraStatus;
  mode: OrbitMode;
  fps: number;
  handDetected: boolean;
  message?: string;
  timestamp: number;
}

export interface LandmarksMessage {
  version: 1;
  type: 'landmarks';
  landmarks: LandmarkPoint[];
  handedness: 'Left' | 'Right';
  confidence: number;
  timestamp: number;
}

export interface PointerPositionMessage {
  version: 1;
  type: 'pointer_position';
  x: number;
  y: number;
  confidence: number;
  timestamp: number;
}

export type GestureName = 'pinch_left' | 'pinch_right' | 'scroll';
export type GesturePhase = 'start' | 'update' | 'end';

export interface GestureMessage {
  version: 1;
  type: 'gesture';
  name: GestureName;
  phase: GesturePhase;
  value?: number;
  confidence: number;
  timestamp: number;
}

export type SafetyReleaseReason = 'tracking_lost' | 'emergency_stop' | 'pause' | 'shutdown';

export interface SafetyReleaseMessage {
  version: 1;
  type: 'safety_release';
  reason: SafetyReleaseReason;
  timestamp: number;
}

export type ControlCommandType = 'SET_MODE' | 'EMERGENCY_STOP' | 'RECALIBRATE' | 'UPDATE_CONFIG' | 'PING';

export interface ControlCommandMessage {
  version: 1;
  type: 'control_command';
  command: ControlCommandType;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export type OrbitMessage =
  | StatusMessage
  | LandmarksMessage
  | PointerPositionMessage
  | GestureMessage
  | SafetyReleaseMessage
  | ControlCommandMessage;

export interface DisplayTarget {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  primary: boolean;
}

export type CalibrationCorner = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';

export interface CalibrationData {
  displayId: string;
  bounds: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
  points: {
    top_left: { x: number; y: number };
    top_right: { x: number; y: number };
    bottom_left: { x: number; y: number };
    bottom_right: { x: number; y: number };
  };
}

export interface OrbitConfig {
  cameraIndex: number;
  targetDisplayId: string;
  smoothingFactor: number;
  sensitivity: number;
  deadzone: number;
  handedness: 'Right' | 'Left';
  leftPinchThreshold: number;
  rightPinchThreshold: number;
  scrollSpeedCap: number;
  emergencyShortcut: string;
}

export const DEFAULT_ORBIT_CONFIG: OrbitConfig = {
  cameraIndex: 0,
  targetDisplayId: 'primary',
  smoothingFactor: 0.65,
  sensitivity: 1.0,
  deadzone: 0.02,
  handedness: 'Right',
  leftPinchThreshold: 0.055,
  rightPinchThreshold: 0.050,
  scrollSpeedCap: 30,
  emergencyShortcut: 'Ctrl+Alt+Backspace',
};
