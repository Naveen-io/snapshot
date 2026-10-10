# FROSTEX ORBIT
## Document 02 — System Architecture & Technology Choices

**Status:** Foundational draft v0.1  
**Platform:** Windows 11, local-first  
**Architecture style:** A small desktop shell plus an isolated vision/input service.

---

## 1. High-level architecture

```text
┌───────────────────────────────────────────────────────┐
│ ORBIT Desktop Shell                                   │
│ Electron + React + TypeScript                         │
│ HUD · settings · calibration · mode indicator · tray  │
└──────────────────────────┬────────────────────────────┘
                           │ validated local messages
                           ▼
┌───────────────────────────────────────────────────────┐
│ Local Control Service                                 │
│ Python · camera capture · hand landmarks · gestures   │
│ smoothing · confidence checks · state machine          │
└──────────────────────────┬────────────────────────────┘
                           │ permission-gated events only
                           ▼
┌───────────────────────────────────────────────────────┐
│ Windows Input Adapter                                │
│ mouse move · click · scroll · key shortcut allowlist  │
│ emergency release · foreground/user-state safeguards  │
└───────────────────────────────────────────────────────┘
```

This is a logical view. The first prototype may put the input adapter inside the Python service to reduce moving parts, but keep it behind a narrow interface so it can be isolated later.

## 2. Recommended stack

| Area | Initial choice | Reason | Constraint |
|---|---|---|---|
| Desktop shell | Electron + React + TypeScript | Familiar web UI workflow, tray/window support, quick iteration | Keep background work out of the renderer; monitor memory use |
| UI build | Vite | Fast local development | Pin compatible versions in lockfiles when implementation starts |
| Vision service | Python | Strong computer-vision ecosystem and quick prototyping | Must be supervised by the shell and shut down cleanly |
| Hand landmarks | MediaPipe Hand Landmarker | Provides 21 hand landmarks that can support cursor mapping and pinch estimation | Must benchmark speed and reliability on the actual camera |
| Camera access | OpenCV VideoCapture (or equivalent proven capture layer) | Common webcam integration | Select camera intentionally; handle unavailable/busy cameras |
| Native input | Windows `SendInput` via a narrow Windows adapter | Documented Windows API for mouse and keyboard input events | Runs with Windows integrity/UIPI limitations; never require admin merely to move the cursor |
| Settings | Local JSON initially; SQLite only when structured profiles/history justify it | Easy to inspect and back up | No camera frames in settings or logs |
| Local communication | Loopback-only WebSocket or named pipe | Clear boundary between UI and vision service | Validate every message; do not listen on the LAN; authenticate local clients where practical |

Official technical references are listed at the end of this document.

## 3. Module boundaries

### A. Desktop shell

Responsibilities:

- Show control state and a clear camera-in-use indicator.
- Start/stop the vision service deliberately and detect crashes.
- Present calibration, sensitivity, handedness, and display settings.
- Expose a persistent emergency pause/stop affordance.
- Validate settings before sending them to the service.
- Avoid passing raw camera frames to the renderer.

Non-responsibilities: computer vision, direct OS input from arbitrary UI code, free-form command execution.

### B. Vision service

Responsibilities:

- Open the selected camera and report whether it is working.
- Run hand-landmark detection on live frames.
- Calculate a small set of derived features, such as fingertip coordinates and thumb-index distance normalized by palm size.
- Apply confidence thresholds, smoothing, dwell/debounce logic, and hand-loss handling.
- Emit structured events such as `hand_present`, `pointer_position`, `left_click_down`, `left_click_up`, and `scroll_delta`.
- Shut down camera capture when the user disables it.

Non-responsibilities: interpreting arbitrary language, saving video, executing shell commands, or deciding to arm itself.

### C. Input adapter

Responsibilities:

- Accept only a small schema of approved input events.
- Convert calibrated coordinates to the active display's coordinate system.
- Generate mouse movement/click/scroll events using the appropriate Windows API.
- Track which synthetic buttons are down and release them during pause, crash, shutdown, or hand-loss timeout.
- Reject input unless pointer mode is explicitly armed.

Non-responsibilities: opening arbitrary paths, running PowerShell/cmd, changing permissions, or injecting into higher-integrity applications. Windows can block input across integrity boundaries.

### D. Policy and state machine

One central state machine owns permission to produce system input. No gesture detector or UI component can bypass it.

Suggested states:

- `OFF` — camera closed, no synthetic input.
- `PREVIEW` — camera is visible to the vision service, but no mouse/keyboard events.
- `CALIBRATING` — gathering calibration points, no normal pointer actions.
- `ARMED` — hand is detected and settings are ready; pointer actions are still gated until the user explicitly enters control mode.
- `POINTER_ACTIVE` — approved pointer events are permitted.
- `PAUSED` — tracking may continue for feedback, but all synthetic input is disabled.
- `ERROR` — input disabled; present a human-readable recovery message.

The names can change, but the separation between tracking and permission to act must remain.

## 4. Message contract

Use typed, versioned messages. Example shapes (not executable code):

```json
{"version":1,"type":"status","camera":"ready","mode":"preview"}
{"version":1,"type":"pointer_position","x":0.52,"y":0.31,"confidence":0.91}
{"version":1,"type":"gesture","name":"pinch_left","phase":"begin","confidence":0.94}
{"version":1,"type":"safety","action":"release_all_buttons","reason":"tracking_lost"}
```

Requirements:

- Coordinates are normalized and finite; reject NaN, infinity, and out-of-range values.
- Confidence is numeric and bounded between 0 and 1.
- Every message has a known type and supported version.
- Unknown message types are ignored and logged locally without enabling input.
- The service never sends a shell command or arbitrary executable path as an action.
- Communication is loopback-only. If WebSocket is chosen, bind only to `127.0.0.1`, use a per-session random token, and validate the sender where possible. A named pipe is a valid alternative if easier to secure and support.

## 5. Input reliability and failure handling

- Use a monotonic timestamp for gesture transitions and timeouts.
- A click is emitted only on an explicit gesture transition, never every video frame that sees a pinch.
- Apply a short debounce and require adequate confidence over several frames.
- If no valid hand is tracked for a short configured grace period, freeze pointer motion. If any synthetic mouse button is held, release it after a safety timeout.
- If the service crashes or the shell closes, release all synthetic buttons and disable further events.
- A physical mouse/keyboard action should be able to pause hand mode.
- Do not request administrator privileges by default. If a target app runs elevated, explain that Windows may block injected input rather than silently escalating ORBIT.

## 6. UI design system

- Base: dark charcoal / near-black.
- Accent: light cyan and neutral white; use colour for state, not decoration.
- Layout: compact rounded panels, strong hierarchy, minimal clutter.
- Motion: restrained transitions; always respect reduced-motion preference where practical.
- HUD: shows only useful state (mode, camera, tracking confidence, active display, and genuine FPS/latency measurements if implemented).
- No always-on giant overlays that obscure the cursor or take over a game.
- Every gesture needs an optional on-screen practice view and a plain-language explanation.

## 7. Performance budgets (targets, not claims)

These are starting targets for testing, not promises:

- Hand-tracking preview: aim for 20–30 FPS at a selected low/moderate camera resolution.
- End-to-end pointer latency: target under 120 ms in a repeatable test.
- Normal pointer mode: target stable tracking without frequent cursor jumps during a 10-minute session.
- Idle footprint: minimise CPU/GPU use when hand mode is off; camera must not remain active invisibly.
- Memory: measure the complete shell plus Python service. If the first build grows beyond a practical budget, simplify effects and restart behaviour before adding more modules.

## 8. Repository proposal

```text
frostex-orbit/
  apps/
    desktop/                 # Electron + React + TypeScript
  services/
    vision/                  # Python camera, landmarks, gesture state
  packages/
    protocol/                # shared event schema and validation examples
  docs/
    01_VISION_AND_PRODUCT_SPEC.md
    02_SYSTEM_ARCHITECTURE.md
    03_INTERACTION_AND_GESTURE_SPEC.md
    04_HARDWARE_FEASIBILITY_AND_SAFETY.md
    05_BUILD_ROADMAP_AND_TEST_PLAN.md
  tests/
    protocol/
    gestures/
    safety/
  README.md
```

Do not create every folder and abstraction before the first proof works. The repository can start smaller and grow with tested need.

## 9. Official references

- MediaPipe Hand Landmarker API: https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/HandLandmarker
- MediaPipe Hand Landmarker options: https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/HandLandmarkerOptions
- Windows `SendInput` documentation: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput
- Windows `INPUT` structure: https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-input
- Microsoft Windows Voice Access overview: https://support.microsoft.com/en-us/accessibility/windows/voice-access/use-voice-access-to-control-your-pc-author-text-using-your-voice
