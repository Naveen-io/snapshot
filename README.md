# FROSTEX ORBIT

> **Local-First Windows 11 Desktop Control System & Spatial HUD**

FROSTEX ORBIT is a personal computing interface inspired by futuristic suit computers. It provides a compact desktop HUD, hand-controlled mouse tracking, emergency controls, voice-command integration, and a modular architecture for optional head/eye inputs and non-invasive brain-computer interface (BCI) research.

---

## 1. Architectural Principles & Safety Invariants

1. **Local-First Processing**: 100% of video frames and sensor data are processed strictly in RAM on the local PC. Zero camera images, audio streams, or personal metrics are ever sent to the cloud or saved to disk.
2. **Camera OFF by Default**: The webcam is never activated automatically on system boot or app launch. Camera capture starts only following an explicit user action (`PREVIEW` or `POINTER` mode).
3. **OS Input Disarmed by Default**: Input injection starts in `OFF` mode on every launch, reboot, service crash, or application restart.
4. **Single Policy Authority**: The central state machine (`OFF`, `PREVIEW`, `CALIBRATION`, `POINTER`, `PAUSED`, `ERROR`) is the sole authority permitted to authorize Windows OS mouse events. Zero input is injected in `PREVIEW` or `CALIBRATION`.
5. **Fail-Closed Synthetic Button Release**: On tracking loss (>300ms), camera disconnection, service restart, emergency stop, or crash, all synthetic mouse buttons are immediately released to prevent stuck drags.
6. **Physical Priority Always**: Physical mouse movement, physical keyboard typing, and global emergency shortcut `Ctrl+Alt+Backspace` instantly override hand tracking.
7. **No Arbitrary Shell Execution**: Spoken and gestured actions are mapped to a static, compile-time allowlist of 5 safe operational shortcuts. Arbitrary shell or PowerShell execution is strictly prohibited.

---

## 2. System Architecture

```text
┌────────────────────────────────────────────────────────┐
│ FROSTEX ORBIT Desktop Shell (Electron + React 19)      │
│ Compact HUD · Tray controls · Calibration · Practice   │
└───────────────────────────┬────────────────────────────┘
                            │ loopback WebSocket (127.0.0.1)
                            │ with session secret token
                            ▼
┌────────────────────────────────────────────────────────┐
│ Python Vision Service (MediaPipe 0.10.35 + OpenCV 5.0) │
│ Camera capture · 21 3D landmarks · Biometric features  │
│ Palm-scale normalization · Adaptive smoothing filter   │
└───────────────────────────┬────────────────────────────┘
                            │ permission-gated events only
                            ▼
┌────────────────────────────────────────────────────────┐
│ Windows Native Input Adapter (Win32 SendInput)         │
│ Display coordinate mapping · Debounced pinch clicks    │
│ Capped scroll delta · Fail-closed synthetic release    │
└────────────────────────────────────────────────────────┘
```

---

## 3. Host Environment Requirements

- **Operating System:** Windows 11 x64 (Build 22000 or newer; verified on Build 26300).
- **Node.js:** v22.x or v24.x (verified on Node v24.18.0 with npm 11.16.0).
- **Python:** Python 3.10 to 3.14 (verified on Python 3.14.3 with `opencv-python`, `mediapipe`, `numpy`, and `websockets`).
- **Webcam:** Any standard USB or integrated webcam (tested with HD User Facing Webcam).
- **Display:** Any standard display (tested with `DISPLAY1` 1536x864 and `DISPLAY5` 1440x900).

---

## 4. Development Setup & Commands

### Clone & Install Dependencies
```powershell
# In project root (d:\E.V)
npm install
python -m pip install -r services/vision/requirements.txt
```

### Run Tests
```powershell
# Run the complete test suite (34 automated tests across TypeScript & Python)
npm test

# Run individual test suites
npm run test:protocol   # Protocol schema & validators
npm run test:desktop    # State machine & Windows input adapter
npm run test:python     # Computer vision feature extraction & smoothing
```

### Launch in Development Mode
```powershell
# Builds Electron main, preload, and Vite renderer, then launches ORBIT
npm run --workspace=apps/desktop build
npm run --workspace=apps/desktop start
```

### Build Windows Application Package
```powershell
npm run --workspace=apps/desktop package
# Output generated in apps/desktop/dist-package/win-unpacked/
```

---

## 5. Keyboard Shortcuts & Controls

| Shortcut | Action | Scope |
|---|---|---|
| `Ctrl + Alt + Backspace` | **Emergency Stop**: Immediately disarms pointer and releases all synthetic mouse buttons. | Global (system-wide) |
| `Ctrl + Alt + G` | Toggle HUD window visibility. | Global |
| `Esc` | Pause pointer mode when HUD is focused. | In-App |

---

## 6. Gesture Grammar

| Gesture | Action | Mechanics & Safety |
|---|---|---|
| **Index Fingertip Move** | Moves Windows mouse cursor | Mapped via 4-point display calibration; speed-adaptive smoothing eliminates tremor while preserving responsiveness. Requires `POINTER` mode. |
| **Thumb + Index Pinch** | Left Click | Emits exactly ONE click on pinch transition. Debounced; holding pinch does not multi-click. |
| **Thumb + Middle Pinch** | Right Click | Requires geometric separation from index finger. |
| **Index + Middle Extended** | Two-Finger Scroll | Peace sign posture with ring and pinky folded. Vertical hand motion scrolls smoothly; click gestures are strictly suppressed during scroll. |

---

## 7. Voice Control Allowlist

FROSTEX ORBIT uses Windows 11 Voice Access as the primary baseline for operating the desktop hands-free. A local allowlist handles 5 specific operational actions:
1. `"Pause ORBIT"` — Immediately transitions state to `PAUSED`.
2. `"Open ORBIT Settings"` — Brings the HUD window to the foreground.
3. `"Center Pointer"` — Snaps cursor to center of active monitor.
4. `"Start Camera Preview"` — Enters `PREVIEW` mode.
5. `"Power Down ORBIT"` — Closes camera and transitions to `OFF`.

---

## 8. Troubleshooting & Known Limitations

- **Elevated Windows (UIPI)**: Windows User Interface Privilege Isolation prevents standard user applications from sending synthetic input to Administrator/Elevated windows (such as Task Manager). This is standard Windows security behavior. Moving cursor back to a standard window restores normal spatial control.
- **Backlighting**: Harsh backlighting (e.g. sitting with a bright window directly behind you) causes silhouetting that degrades landmark confidence. Ensure comfortable ambient room light.
- **Hand-Loss Freeze**: If your hand leaves the camera frame, pointer motion freezes immediately. If a synthetic button was held down, it is released automatically after 300 ms.
- **Hardware-Gated Sensors**: Dedicated eye tracking requires specialized infrared hardware (e.g. Tobii Eye Tracker 5). BCI/EEG is strictly non-invasive research-stage functionality and requires specialized hardware.
