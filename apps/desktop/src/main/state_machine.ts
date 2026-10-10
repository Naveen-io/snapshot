import type { OrbitMode, SafetyReleaseReason } from '../../../../packages/protocol/src/types.ts';

export type StateChangeCallback = (newMode: OrbitMode, prevMode: OrbitMode) => void;
export type SafetyReleaseCallback = (reason: SafetyReleaseReason) => void;

export class OrbitStateMachine {
  private _currentMode: OrbitMode = 'OFF';
  private _stateChangeListeners: Set<StateChangeCallback> = new Set();
  private _safetyReleaseListeners: Set<SafetyReleaseCallback> = new Set();

  constructor(initialMode: OrbitMode = 'OFF') {
    // Invariant: Always starts in OFF by default
    this._currentMode = initialMode;
  }

  get mode(): OrbitMode {
    return this._currentMode;
  }

  /**
   * Sole authority determining whether OS mouse/keyboard actions are permitted.
   * Invariant: ONLY returns true when mode is strictly 'POINTER'.
   */
  canAuthorizeInput(): boolean {
    return this._currentMode === 'POINTER';
  }

  onStateChange(cb: StateChangeCallback): () => void {
    this._stateChangeListeners.add(cb);
    return () => this._stateChangeListeners.delete(cb);
  }

  onSafetyRelease(cb: SafetyReleaseCallback): () => void {
    this._safetyReleaseListeners.add(cb);
    return () => this._safetyReleaseListeners.delete(cb);
  }

  private _notifySafetyRelease(reason: SafetyReleaseReason): void {
    for (const cb of this._safetyReleaseListeners) {
      try {
        cb(reason);
      } catch (err) {
        console.error('Error in safety release listener:', err);
      }
    }
  }

  private _transition(targetMode: OrbitMode): void {
    const prev = this._currentMode;
    if (prev === targetMode) return;

    // If exiting POINTER mode, immediately trigger fail-closed button release
    if (prev === 'POINTER') {
      this._notifySafetyRelease(targetMode === 'PAUSED' ? 'pause' : 'shutdown');
    }

    this._currentMode = targetMode;
    for (const cb of this._stateChangeListeners) {
      try {
        cb(targetMode, prev);
      } catch (err) {
        console.error('Error in state change listener:', err);
      }
    }
  }

  /**
   * Request transition to a target mode following explicit state machine rules.
   */
  requestMode(targetMode: OrbitMode): { success: boolean; reason?: string } {
    if (this._currentMode === targetMode) {
      return { success: true };
    }

    switch (this._currentMode) {
      case 'OFF':
        if (targetMode === 'PREVIEW' || targetMode === 'ERROR') {
          this._transition(targetMode);
          return { success: true };
        }
        return { success: false, reason: 'Must enter PREVIEW before activating other modes from OFF' };

      case 'PREVIEW':
        if (['CALIBRATION', 'POINTER', 'PAUSED', 'OFF', 'ERROR'].includes(targetMode)) {
          this._transition(targetMode);
          return { success: true };
        }
        return { success: false, reason: `Invalid transition from PREVIEW to ${targetMode}` };

      case 'CALIBRATION':
        if (['PREVIEW', 'POINTER', 'PAUSED', 'OFF', 'ERROR'].includes(targetMode)) {
          this._transition(targetMode);
          return { success: true };
        }
        return { success: false, reason: `Invalid transition from CALIBRATION to ${targetMode}` };

      case 'POINTER':
        if (['PAUSED', 'PREVIEW', 'CALIBRATION', 'OFF', 'ERROR'].includes(targetMode)) {
          this._transition(targetMode);
          return { success: true };
        }
        return { success: false, reason: `Invalid transition from POINTER to ${targetMode}` };

      case 'PAUSED':
        if (['POINTER', 'PREVIEW', 'CALIBRATION', 'OFF', 'ERROR'].includes(targetMode)) {
          this._transition(targetMode);
          return { success: true };
        }
        return { success: false, reason: `Invalid transition from PAUSED to ${targetMode}` };

      case 'ERROR':
        // From ERROR, the system can only safely reset to OFF
        if (targetMode === 'OFF') {
          this._transition(targetMode);
          return { success: true };
        }
        return { success: false, reason: 'From ERROR mode, the system must first reset to OFF' };

      default:
        return { success: false, reason: 'Unknown state' };
    }
  }

  /**
   * Emergency stop immediately disarms all OS inputs and transitions to PAUSED.
   */
  emergencyStop(): void {
    if (this._currentMode === 'POINTER') {
      this._notifySafetyRelease('emergency_stop');
    }
    this._currentMode = 'PAUSED';
    for (const cb of this._stateChangeListeners) {
      try {
        cb('PAUSED', this._currentMode);
      } catch (err) {
        console.error('Error in emergency stop listener:', err);
      }
    }
  }

  /**
   * Triggered when hand-loss timeout (>300ms) occurs during tracking.
   */
  handleHandLoss(): void {
    if (this._currentMode === 'POINTER') {
      this._notifySafetyRelease('tracking_lost');
    }
  }
}
