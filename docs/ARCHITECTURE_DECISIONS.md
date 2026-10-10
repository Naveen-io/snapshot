# FROSTEX ORBIT — ARCHITECTURE DECISIONS (ADR)

## ADR-001: Multi-Process Separation (Python Vision Service + Electron Desktop Shell)
- **Status:** Accepted
- **Context:** MediaPipe Hand Landmarker has optimal Python native bindings (0.10.35) and OpenCV provides direct hardware video capture. The desktop shell needs rich Windows system tray integration, borderless compact HUD windows, global system hotkeys, and modern UI rendering. Running heavy computer vision inference in the Electron main/renderer thread would freeze the UI and degrade input response time.
- **Decision:** Split the system into an isolated Python Vision Service (`services/vision/`) and an Electron + React 19 + TypeScript desktop shell (`apps/desktop/`). The Electron process acts as a supervisor, launching and cleanly killing the Python child process.
- **Consequences:** Clean separation of concerns. Requires a robust inter-process communication (IPC) channel and lifecycle management.

## ADR-002: Loopback IPC with Session Secret
- **Status:** Accepted
- **Context:** The vision service and desktop shell must exchange high-frequency tracking data (30 FPS) and control commands. Exposing network ports is a security risk.
- **Decision:** Use a loopback-only WebSocket or local socket bound strictly to `127.0.0.1` on an ephemeral or configured port. Authenticate the connection using a cryptographically random per-session secret token passed to the child process via environment variable upon launch.
- **Consequences:** Safe against other local network devices and unauthorized local processes.

## ADR-003: Single Input Policy State Machine
- **Status:** Accepted
- **Context:** Direct injection of mouse events from raw computer vision or UI buttons can cause race conditions, runaway cursor movement, or unintended clicks during calibration or preview.
- **Decision:** Implement a single strict finite state machine with the states:
  - `OFF`: Camera closed, zero synthetic inputs permitted.
  - `PREVIEW`: Camera running, landmarks rendered for user feedback, zero OS mouse/keyboard events.
  - `CALIBRATION`: Display corner calibration active, zero normal mouse movements.
  - `POINTER`: Calibrated pointer tracking active; only normalized, smoothed index-finger coordinates produce OS cursor moves.
  - `PAUSED`: Camera may remain open or paused; all synthetic mouse events strictly blocked.
  - `ERROR`: Hardware or service fault; all synthetic inputs blocked, recovery message displayed.
- **Consequences:** No module other than the Input Policy State Machine may authorize mouse/keyboard events.

## ADR-004: Fail-Closed Synthetic Button Release
- **Status:** Accepted
- **Context:** If a hand leaves the camera frame or the vision service crashes while a synthetic mouse button is held down (e.g., during a pinch or drag), Windows could leave the button permanently pressed, ruining desktop usability.
- **Decision:** Maintain an active synthetic button registry. If hand tracking confidence drops below threshold or no hand is detected for >300ms, or on emergency stop / process shutdown, an immediate synthetic `mouse_up` event is fired for all buttons.
- **Consequences:** Guaranteed prevention of "stuck mouse button" defects.

## ADR-005: 4-Point Display Coordinate Mapping with Deadband & Adaptive Smoothing
- **Status:** Accepted
- **Context:** Camera aspect ratios and hand reach do not match monitor dimensions 1:1. Hand tremor at rest causes jitter, while over-smoothing causes lag.
- **Decision:** Calibrate a 4-point bounding box on the user's chosen physical display (`DISPLAY1` or `DISPLAY5`). Map normalized hand coordinates using bilinear interpolation. Apply speed-adaptive Exponential Moving Average (EMA) smoothing: high smoothing when hand is stationary (eliminating jitter), low smoothing when hand is moving fast (reducing latency under 100ms).
- **Consequences:** Smooth, precise control on targets with rapid flick tracking.
