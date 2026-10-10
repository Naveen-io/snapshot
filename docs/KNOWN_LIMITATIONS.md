# FROSTEX ORBIT — KNOWN LIMITATIONS & HARDWARE CONSTRAINTS

## 1. Computer Vision & Environmental Constraints
- **Lighting Sensitivity**: Tracking requires reasonable ambient front lighting. Extreme backlighting (such as sitting directly in front of a bright window) creates silhouettes that reduce MediaPipe landmark confidence.
- **Camera Field of View & Reach**: The user's hand must remain within the webcam's optical cone. If the hand moves outside the frame, tracking will safely freeze and pause after the 300ms timeout.
- **Single Hand Tracking in MVP**: Version 1 explicitly tracks one primary hand (configurable Left or Right). Secondary hand input is filtered to prevent accidental cursor conflicts.

## 2. Windows OS Constraints
- **Elevated Windows (UIPI)**: Windows User Interface Privilege Isolation blocks standard user processes from injecting mouse/keyboard events into elevated applications (e.g., Task Manager, elevated terminals, installers). This is standard Windows security behavior.
- **Multi-Monitor Coordinate Offsets**: Moving the cursor across mixed DPI displays requires per-display calibration. Version 1 provides calibrated mapping for one user-selected display at a time (`DISPLAY1` or `DISPLAY5`).

## 3. Sensor Scope (MVP vs. Later Phases)
- **Generic Webcam Eye-Tracking**: Standard webcams cannot provide reliable, pixel-accurate gaze targeting without dedicated infrared hardware (e.g. Tobii Eye Tracker 5). In the MVP, eye-gaze mouse control is marked as unsupported/hardware-gated.
- **Brain-Computer Interfaces (BCI)**: BCI/EEG is strictly non-invasive research-stage functionality. It does not provide thought-reading or direct cursor control in the MVP and requires specialized external hardware.
- **Voice Control**: Relies primarily on Windows 11 Voice Access baseline; custom voice control is restricted to an allowlist of 5 safe operational shortcuts.
