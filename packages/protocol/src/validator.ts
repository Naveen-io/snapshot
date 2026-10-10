import {
  PROTOCOL_VERSION,
  type OrbitMessage,
  type StatusMessage,
  type LandmarksMessage,
  type PointerPositionMessage,
  type GestureMessage,
  type SafetyReleaseMessage,
  type ControlCommandMessage,
  type OrbitMode,
  type CameraStatus,
  type GestureName,
  type GesturePhase,
  type SafetyReleaseReason,
  type ControlCommandType,
} from './types.ts';

export interface ValidationResult<T> {
  valid: boolean;
  error?: string;
  value?: T;
}

export function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

export function isNormalized(val: unknown): val is number {
  return isFiniteNumber(val) && val >= 0 && val <= 1;
}

const VALID_MODES: Set<OrbitMode> = new Set(['OFF', 'PREVIEW', 'CALIBRATION', 'POINTER', 'PAUSED', 'ERROR']);
const VALID_CAMERA_STATUSES: Set<CameraStatus> = new Set(['closed', 'opening', 'active', 'error']);
const VALID_GESTURES: Set<GestureName> = new Set(['pinch_left', 'pinch_right', 'scroll']);
const VALID_PHASES: Set<GesturePhase> = new Set(['start', 'update', 'end']);
const VALID_SAFETY_REASONS: Set<SafetyReleaseReason> = new Set(['tracking_lost', 'emergency_stop', 'pause', 'shutdown']);
const VALID_COMMANDS: Set<ControlCommandType> = new Set(['SET_MODE', 'EMERGENCY_STOP', 'RECALIBRATE', 'UPDATE_CONFIG', 'PING']);

export function validateMessage(raw: unknown): ValidationResult<OrbitMessage> {
  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, error: 'Message must be a non-null object' };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.version !== PROTOCOL_VERSION) {
    return { valid: false, error: `Invalid protocol version. Expected ${PROTOCOL_VERSION}, got ${String(obj.version)}` };
  }

  if (typeof obj.type !== 'string') {
    return { valid: false, error: 'Missing or non-string message type' };
  }

  if (!isFiniteNumber(obj.timestamp) || obj.timestamp <= 0) {
    return { valid: false, error: 'Timestamp must be a positive finite number' };
  }

  switch (obj.type) {
    case 'status': {
      if (!VALID_CAMERA_STATUSES.has(obj.camera as CameraStatus)) {
        return { valid: false, error: `Invalid camera status: ${String(obj.camera)}` };
      }
      if (!VALID_MODES.has(obj.mode as OrbitMode)) {
        return { valid: false, error: `Invalid mode: ${String(obj.mode)}` };
      }
      if (!isFiniteNumber(obj.fps) || obj.fps < 0) {
        return { valid: false, error: 'FPS must be a non-negative finite number' };
      }
      if (typeof obj.handDetected !== 'boolean') {
        return { valid: false, error: 'handDetected must be boolean' };
      }
      if (obj.message !== undefined && typeof obj.message !== 'string') {
        return { valid: false, error: 'Status message must be a string if provided' };
      }
      return { valid: true, value: obj as unknown as StatusMessage };
    }

    case 'landmarks': {
      if (!Array.isArray(obj.landmarks) || obj.landmarks.length !== 21) {
        return { valid: false, error: `Landmarks must be an array of exactly 21 points, got ${Array.isArray(obj.landmarks) ? obj.landmarks.length : typeof obj.landmarks}` };
      }
      for (let i = 0; i < obj.landmarks.length; i++) {
        const pt = obj.landmarks[i];
        if (typeof pt !== 'object' || pt === null) {
          return { valid: false, error: `Landmark ${i} is not a valid object` };
        }
        if (!isFiniteNumber(pt.x) || !isFiniteNumber(pt.y) || !isFiniteNumber(pt.z)) {
          return { valid: false, error: `Landmark ${i} coordinates must be finite numbers` };
        }
      }
      if (obj.handedness !== 'Left' && obj.handedness !== 'Right') {
        return { valid: false, error: `Invalid handedness: ${String(obj.handedness)}` };
      }
      if (!isNormalized(obj.confidence)) {
        return { valid: false, error: `Confidence must be in range [0, 1], got ${String(obj.confidence)}` };
      }
      return { valid: true, value: obj as unknown as LandmarksMessage };
    }

    case 'pointer_position': {
      if (!isNormalized(obj.x) || !isNormalized(obj.y)) {
        return { valid: false, error: `Pointer coordinates must be normalized [0, 1], got x=${String(obj.x)}, y=${String(obj.y)}` };
      }
      if (!isNormalized(obj.confidence)) {
        return { valid: false, error: `Confidence must be in range [0, 1], got ${String(obj.confidence)}` };
      }
      return { valid: true, value: obj as unknown as PointerPositionMessage };
    }

    case 'gesture': {
      if (!VALID_GESTURES.has(obj.name as GestureName)) {
        return { valid: false, error: `Invalid gesture name: ${String(obj.name)}` };
      }
      if (!VALID_PHASES.has(obj.phase as GesturePhase)) {
        return { valid: false, error: `Invalid gesture phase: ${String(obj.phase)}` };
      }
      if (obj.value !== undefined && !isFiniteNumber(obj.value)) {
        return { valid: false, error: 'Gesture value must be a finite number if provided' };
      }
      if (!isNormalized(obj.confidence)) {
        return { valid: false, error: `Confidence must be in range [0, 1], got ${String(obj.confidence)}` };
      }
      return { valid: true, value: obj as unknown as GestureMessage };
    }

    case 'safety_release': {
      if (!VALID_SAFETY_REASONS.has(obj.reason as SafetyReleaseReason)) {
        return { valid: false, error: `Invalid safety release reason: ${String(obj.reason)}` };
      }
      return { valid: true, value: obj as unknown as SafetyReleaseMessage };
    }

    case 'control_command': {
      if (!VALID_COMMANDS.has(obj.command as ControlCommandType)) {
        return { valid: false, error: `Invalid control command: ${String(obj.command)}` };
      }
      if (obj.payload !== undefined && (typeof obj.payload !== 'object' || obj.payload === null)) {
        return { valid: false, error: 'Command payload must be an object if provided' };
      }
      return { valid: true, value: obj as unknown as ControlCommandMessage };
    }

    default:
      return { valid: false, error: `Unknown message type: ${String(obj.type)}` };
  }
}
