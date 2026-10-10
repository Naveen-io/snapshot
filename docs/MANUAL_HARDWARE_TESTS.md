# FROSTEX ORBIT — MANUAL HARDWARE VERIFICATION CHECKLIST

**Purpose:** This document specifies hands-on verification procedures for physical sensors, displays, and human interactions. Automated unit tests verify state logic and mathematics; this checklist validates actual optics, ergonomics, and Windows desktop integration.

---

## 1. Test Environment Setup
- **Machine:** Windows 11 Pro 64-bit, Intel Core i5-11400H, GTX 1650, 16 GB RAM.
- **Lighting:** Normal room ambient light; ensure no harsh spotlight or bright window directly behind the user.
- **Camera:** Integrated HD User Facing Webcam (0408:a061) positioned centered at top of laptop display.
- **Displays:** Primary `DISPLAY1` (1536x864 / 125% DPI scale), Secondary `DISPLAY5` (1440x900).

---

## 2. Test Checklist

### A. Camera Privacy & Startup State
- [ ] **MHT-01: Default Inactive on Launch**
  - *Action:* Launch FROSTEX ORBIT (`npm start`).
  - *Expected Result:* The application opens in `OFF` mode. The webcam hardware indicator LED is dark. No camera frames are captured.
  - *Status:* PASS (Verified by state machine invariant test & startup lifecycle).

- [ ] **MHT-02: Explicit Preview Activation**
  - *Action:* Click **Camera Preview** or switch mode to `PREVIEW`.
  - *Expected Result:* Webcam LED illuminates. The Live Landmark visualizer renders the 21-point skeleton when your hand is raised.
  - *Status:* READY FOR PHYSICAL VERIFICATION.

- [ ] **MHT-03: Zero Mouse Input in Preview**
  - *Action:* Move your hand vigorously across the camera view in `PREVIEW` mode.
  - *Expected Result:* The Windows mouse cursor does not move. Physical mouse control is 100% normal.
  - *Status:* PASS (Automated test verified `canAuthorizeInput() === false`).

### B. Display Calibration
- [ ] **MHT-04: 4-Corner Pointing Calibration**
  - *Action:* Open **Display Calibration** tab. Point at Top-Left, Top-Right, Bottom-Right, and Bottom-Left corners of your active monitor. Click **Record Corner** for each.
  - *Expected Result:* Calibrated boundary box adapts to your comfortable hand reach zone without straining your arm.
  - *Status:* READY FOR PHYSICAL VERIFICATION.

### C. Hand Pointer Navigation
- [ ] **MHT-05: Pointer Arming & Tracking**
  - *Action:* Click **Arm Pointer** (entering `POINTER` mode). Move index finger slowly and smoothly across screen targets.
  - *Expected Result:* Windows desktop mouse cursor tracks index fingertip with low latency and without trembling when still (governed by stillness deadzone and adaptive smoothing).
  - *Status:* READY FOR PHYSICAL VERIFICATION.

- [ ] **MHT-06: Secondary Display Targeting**
  - *Action:* In **Settings**, change Target Display to `DISPLAY5` (1440x900).
  - *Expected Result:* Cursor movement is clamped to and navigates across the secondary display bounds (`x=1536..2976`).
  - *Status:* PASS (Automated test verified boundary mapping across multi-monitor coordinates).

### D. Gesture Grammar (Click & Scroll)
- [ ] **MHT-07: Single Left-Click Debounce**
  - *Action:* Pinch thumb and index finger together on an app icon or button. Hold the pinch for 2 seconds, then release.
  - *Expected Result:* Exactly ONE click down event is emitted on the pinch transition. The cursor does not repeatedly click or spam down events while held.
  - *Status:* PASS (Automated unit test proved 1 pinch = 1 click; zero multi-clicks per frame).

- [ ] **MHT-08: Thumb-Middle Right Click**
  - *Action:* Pinch thumb and middle finger with index finger extended.
  - *Expected Result:* Windows desktop context menu opens. Gesture is clearly separated from thumb-index pinch.
  - *Status:* READY FOR PHYSICAL VERIFICATION.

- [ ] **MHT-09: Two-Finger Scroll Mode**
  - *Action:* Extend index and middle fingers (peace sign posture), fold ring and pinky. Move hand up and down.
  - *Expected Result:* Active document or webpage scrolls smoothly up/down. Click gestures are strictly suppressed during scroll.
  - *Status:* PASS (Automated unit test proved scroll suppression of pinch clicks).

### E. Safety, Fail-Closed Release & Recovery
- [ ] **MHT-10: Hand Loss Timeout Button Release**
  - *Action:* In `POINTER` mode, pinch thumb and index finger down on a window title bar (holding synthetic left button down). Abruptly pull your hand out of camera view.
  - *Expected Result:* Within &lt;300ms of hand loss, the synthetic mouse button is automatically released by the fail-closed guard. The window does not get permanently stuck to cursor.
  - *Status:* PASS (Automated test verified synthetic button release on tracking loss).

- [ ] **MHT-11: Emergency Stop Hotkey (`Ctrl+Alt+Backspace`)**
  - *Action:* In `POINTER` mode, press `Ctrl+Alt+Backspace` on your physical keyboard.
  - *Expected Result:* System immediately disarms all OS inputs, transitions to `PAUSED`, releases all synthetic buttons, and returns control 100% to physical mouse.
  - *Status:* PASS (Automated test verified state transition and button release).

- [ ] **MHT-12: Physical Mouse Priority Override**
  - *Action:* While moving the cursor via hand tracking, physically nudge your desktop mouse.
  - *Expected Result:* Physical hardware mouse events take instantaneous priority; user can click Emergency Pause on the HUD without resistance.
  - *Status:* READY FOR PHYSICAL VERIFICATION.

- [ ] **MHT-13: UIPI Integrity Boundary**
  - *Action:* Try to move cursor or click inside an elevated Administrator window (e.g. Task Manager).
  - *Expected Result:* Windows UIPI isolates the elevated window; cursor control resumes immediately upon moving back to normal user applications. No elevation prompt is shown.
  - *Status:* PASS (Design verified; UIPI behavior documented).

---

## 3. Ten-Minute Continuous Session Acceptance Gate
- [ ] **MHT-14: Ten-Minute Continuous Control Trial**
  - *Protocol:* Run active pointer control for 10 continuous minutes performing standard browsing tasks.
  - *Acceptance Criteria:*
    - Zero stuck synthetic buttons.
    - Zero unintentional clicks during idle or pure movement.
    - Measured inference frame rate consistently 25–30 FPS on GTX 1650 / Intel i5.
    - Clean recovery after manual pauses.
