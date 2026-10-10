import type { DisplayTarget, GestureMessage, SafetyReleaseReason } from '../../../../../packages/protocol/src/types.ts';
import type { OrbitStateMachine } from '../state_machine.ts';
import type { DisplayCalibrationManager } from './calibration.ts';

export type MouseButton = 'left' | 'right' | 'middle';

export interface InputEventRecord {
  type: 'move' | 'down' | 'up' | 'scroll';
  button?: MouseButton;
  x?: number;
  y?: number;
  delta?: number;
  timestamp: number;
}

export interface IWindowsInputSink {
  moveCursor(x: number, y: number): void;
  mouseDown(button: MouseButton): void;
  mouseUp(button: MouseButton): void;
  scrollWheel(deltaY: number): void;
}

/**
 * In-memory simulated input sink for automated testing.
 * Guarantees automated tests NEVER inject synthetic input into the developer's live desktop.
 */
export class MockInputSink implements IWindowsInputSink {
  public history: InputEventRecord[] = [];
  public currentX = 0;
  public currentY = 0;
  public downButtons: Set<MouseButton> = new Set();

  moveCursor(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
    this.history.push({ type: 'move', x, y, timestamp: Date.now() });
  }

  mouseDown(button: MouseButton): void {
    this.downButtons.add(button);
    this.history.push({ type: 'down', button, timestamp: Date.now() });
  }

  mouseUp(button: MouseButton): void {
    this.downButtons.delete(button);
    this.history.push({ type: 'up', button, timestamp: Date.now() });
  }

  scrollWheel(deltaY: number): void {
    this.history.push({ type: 'scroll', delta: deltaY, timestamp: Date.now() });
  }

  clear(): void {
    this.history = [];
    this.downButtons.clear();
  }
}

/**
 * Windows Native Win32 Input Sink.
 * Uses User32 SetCursorPos and mouse_event via C# reflection / SendInput.
 */
export class Win32InputSink implements IWindowsInputSink {
  // PowerShell/Node user32 execution helper
  private _spawnProc: ((cmd: string) => void) | null = null;

  constructor(customExec?: (cmd: string) => void) {
    this._spawnProc = customExec || null;
  }

  moveCursor(x: number, y: number): void {
    if (this._spawnProc) {
      this._spawnProc(`[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(x)}, ${Math.round(y)})`);
    }
  }

  mouseDown(button: MouseButton): void {
    if (this._spawnProc) {
      const flag = button === 'left' ? 0x0002 : button === 'right' ? 0x0008 : 0x0020;
      this._spawnProc(`Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);' -Name M -Namespace U; [U.M]::mouse_event(${flag}, 0, 0, 0, 0)`);
    }
  }

  mouseUp(button: MouseButton): void {
    if (this._spawnProc) {
      const flag = button === 'left' ? 0x0004 : button === 'right' ? 0x0010 : 0x0040;
      this._spawnProc(`Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);' -Name M -Namespace U; [U.M]::mouse_event(${flag}, 0, 0, 0, 0)`);
    }
  }

  scrollWheel(deltaY: number): void {
    if (this._spawnProc) {
      const delta = Math.round(deltaY * 120);
      this._spawnProc(`Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);' -Name M -Namespace U; [U.M]::mouse_event(0x0800, 0, 0, ${delta}, 0)`);
    }
  }
}

export class WindowsInputAdapter {
  private _stateMachine: OrbitStateMachine;
  private _calibration: DisplayCalibrationManager;
  private _targetDisplay: DisplayTarget;
  private _sink: IWindowsInputSink;
  private _heldButtons: Set<MouseButton> = new Set();
  private _scrollSpeedCap = 35;

  constructor(
    stateMachine: OrbitStateMachine,
    calibration: DisplayCalibrationManager,
    targetDisplay: DisplayTarget,
    sink: IWindowsInputSink
  ) {
    this._stateMachine = stateMachine;
    this._calibration = calibration;
    this._targetDisplay = targetDisplay;
    this._sink = sink;

    // Automatic fail-closed release listener on state transitions or hand loss
    this._stateMachine.onSafetyRelease((reason: SafetyReleaseReason) => {
      this.releaseAllHeldButtons(reason);
    });
  }

  get heldButtons(): Set<MouseButton> {
    return new Set(this._heldButtons);
  }

  setTargetDisplay(display: DisplayTarget): void {
    this._targetDisplay = display;
  }

  setScrollSpeedCap(cap: number): void {
    this._scrollSpeedCap = Math.max(5, Math.min(100, cap));
  }

  /**
   * Translates normalized coordinates into physical screen coordinates.
   * Gated strictly behind stateMachine.canAuthorizeInput().
   */
  onPointerPosition(normX: number, normY: number): boolean {
    if (!this._stateMachine.canAuthorizeInput()) {
      return false;
    }

    const ratio = this._calibration.mapToScreenRatio(normX, normY);
    const screenX = this._targetDisplay.x + Math.round(ratio.x * (this._targetDisplay.width - 1));
    const screenY = this._targetDisplay.y + Math.round(ratio.y * (this._targetDisplay.height - 1));

    // Clamp coordinates safely within physical display geometry
    const clampedX = Math.max(this._targetDisplay.x, Math.min(this._targetDisplay.x + this._targetDisplay.width - 1, screenX));
    const clampedY = Math.max(this._targetDisplay.y, Math.min(this._targetDisplay.y + this._targetDisplay.height - 1, screenY));

    this._sink.moveCursor(clampedX, clampedY);
    return true;
  }

  /**
   * Processes gesture events (left/right pinch click, scroll).
   * Gated strictly behind stateMachine.canAuthorizeInput().
   */
  onGesture(gesture: GestureMessage): boolean {
    if (!this._stateMachine.canAuthorizeInput()) {
      return false;
    }

    if (gesture.name === 'pinch_left') {
      if (gesture.phase === 'start' && !this._heldButtons.has('left')) {
        this._heldButtons.add('left');
        this._sink.mouseDown('left');
        return true;
      } else if (gesture.phase === 'end' && this._heldButtons.has('left')) {
        this._heldButtons.delete('left');
        this._sink.mouseUp('left');
        return true;
      }
    } else if (gesture.name === 'pinch_right') {
      if (gesture.phase === 'start' && !this._heldButtons.has('right')) {
        this._heldButtons.add('right');
        this._sink.mouseDown('right');
        return true;
      } else if (gesture.phase === 'end' && this._heldButtons.has('right')) {
        this._heldButtons.delete('right');
        this._sink.mouseUp('right');
        return true;
      }
    } else if (gesture.name === 'scroll' && gesture.phase === 'update' && gesture.value !== undefined) {
      // In scroll mode: cap delta to avoid runaway scrolling
      const cappedDelta = Math.max(-this._scrollSpeedCap, Math.min(this._scrollSpeedCap, gesture.value));
      this._sink.scrollWheel(cappedDelta);
      return true;
    }

    return false;
  }

  /**
   * Fail-Closed Safety: Releases any active synthetic mouse buttons.
   */
  releaseAllHeldButtons(reason: string = 'manual'): void {
    if (this._heldButtons.size === 0) return;

    for (const btn of Array.from(this._heldButtons)) {
      this._sink.mouseUp(btn);
    }
    this._heldButtons.clear();
  }
}
