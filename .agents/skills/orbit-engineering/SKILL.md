---
name: orbit-engineering
description: Critical invariants, architecture boundaries, safety protocols, and test/release workflows for FROSTEX ORBIT Windows desktop interface.
---

# FROSTEX ORBIT Engineering Guide & Invariants

## Core Invariants
1. **Local-First & Privacy First**: Zero camera frames or microphone streams may ever be sent to any network endpoint or written to disk/logs. Diagnostic logs record only timestamps, state transitions, FPS metrics, and errors.
2. **Camera OFF by Default**: Camera is never activated automatically upon boot, login, or application start. Activation requires explicit user interaction (`PREVIEW` or `POINTER` request).
3. **OS Input Disarmed by Default**: On initial launch, restart, service crash, or system reboot, the input state machine defaults strictly to `OFF`. Input can never silently arm itself.
4. **Single Policy Gate Authority**: Only the central state machine (`OFF`, `PREVIEW`, `CALIBRATION`, `POINTER`, `PAUSED`, `ERROR`) authorizes input events. No gesture detector, UI component, or renderer IPC can bypass this gate.
5. **Fail-Closed Safety**: On hand loss (>300ms), camera disconnection, service crash, or emergency stop, all synthetic buttons and keys held by ORBIT must be immediately released, and the system transitions to `PAUSED` or `ERROR`.
6. **No Admin Privileges Required**: ORBIT runs with standard user tokens via standard Windows `SendInput`. It never attempts to bypass Windows UIPI / integrity boundaries.
7. **No Arbitrary Shell Execution**: Gestures and voice triggers map strictly to allowlisted, reviewed, non-destructive actions. Never pipe spoken or gestured commands to PowerShell, cmd, or shell.

## Architecture Boundaries
- `apps/desktop/`: Electron + React + TypeScript + Vite. UI, Tray, State Visualizer, HUD, Settings, and process supervisor. Strict context isolation, no `nodeIntegration` in renderer, minimal preload IPC.
- `services/vision/`: Python service running OpenCV camera capture and MediaPipe Hand Landmarker. Computes normalized landmarks, smoothing, and gesture transition detection. Communicates via loopback socket/IPC with versioned payloads.
- `packages/protocol/`: Shared versioned schemas and validator contracts for all inter-process messages.
- `apps/desktop/src/main/input/`: Windows native input adapter executing `SendInput` mouse movement, debounced clicks, and capped scrolling.

## Design System Invariants
- Palette: Dark matte charcoal base (`#0c0f12`), dark surfaces (`#14191f`, `#1b222a`), refined cyan accent (`#00e5ff`, `#00b4d8`), neutral crisp text (`#f0f6fc`), muted steel (`#8b949e`), danger (`#ff4d4f`), warning (`#faad14`).
- No purple AI slop, no fake 3D holograms, no fake FPS or telemetry counters, no dead interactive elements.
