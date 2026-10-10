# FROSTEX ORBIT
## Document 05 — Build Roadmap, Test Plan & Definition of Done

**Status:** Foundational draft v0.1  
**Build policy:** Prove each capability in a small working slice before adding another.

---

## 1. Build sequence

### Phase 0 — Confirm environment and create the repo

**Deliverables**
- Confirm Windows version, Python availability, Node.js/npm availability, webcam index, camera resolution, and active display geometry.
- Create the repository and the five planning documents.
- Decide the actual package versions and commit lockfiles only when implementation begins.
- Create a camera privacy indicator and document how to stop the service.

**Exit gate**
- Repo builds cleanly with a minimal desktop shell.
- Camera is closed by default; starting/stopping it is explicit.

### Phase 1 — Vision-only prototype

**Deliverables**
- Python service opens the chosen webcam.
- MediaPipe detects a hand and renders landmarks in a debug preview.
- Show status for camera availability, hand detected/not detected, and measured frame rate.
- No synthetic mouse or keyboard events exist in this phase.

**Exit gate**
- On the user's normal setup, the service tracks one hand for a repeatable five-minute test under reasonable lighting.
- Camera closure is reliable and any camera error is shown in plain language.

### Phase 2 — Pointer movement only

**Deliverables**
- Four-point calibration for one display.
- Index-tip coordinate mapping.
- Smoothing, sensitivity, dead-zone, and hand-loss pause.
- Explicit arming state; movement is disabled unless the user has entered pointer mode.
- Emergency stop wired before click gestures are added.

**Exit gate**
- User can move the cursor to large targets without repeated jumps.
- Emergency stop reliably disables future synthetic events.
- No click, drag, or keyboard actions can be produced yet.

### Phase 3 — Click and scroll

**Deliverables**
- Thumb-index left click.
- Separate right-click gesture.
- Two-finger scroll mode.
- Gesture transition detection, confidence gates, debouncing, release handling.
- Visible click/scroll feedback during practice.

**Exit gate**
- No stuck buttons in a 10-minute test.
- A single pinch produces at most one click.
- If hand/camera tracking disappears, all held buttons are released safely.
- No accidental high-impact action is possible.

### Phase 4 — ORBIT desktop experience

**Deliverables**
- Clean HUD, tray controls, and compact settings window.
- First-run calibration/practice wizard.
- Save local preferences and one or more profiles.
- True status indicators for mode, camera, selected display, and tracking.
- Crash recovery and clear error states.

**Exit gate**
- Restarting the app does not silently re-arm the pointer.
- The user can switch between normal mouse use and ORBIT without rebooting.
- The settings are understandable without reading source code.

### Phase 5 — Practical voice and desktop actions

**Deliverables**
- Document and test Windows Voice Access as the native baseline.
- Add only a small local allowlist of ORBIT-specific spoken commands if a clear gap remains.
- Add configured low-risk shortcuts such as opening a chosen application or pausing ORBIT.
- Require explicit confirmations and reject unrecognised high-impact commands.

**Exit gate**
- Normal conversation does not routinely trigger actions.
- Any activated voice action provides clear feedback.
- No natural-language-to-shell or arbitrary command execution exists.

### Phase 6 — Optional head and eye inputs

**Deliverables**
- Experiment with face landmarks/head pose for coarse navigation.
- Keep it separate behind an input adapter.
- Assess dedicated eye-tracker integration only after checking device/software support and cost.

**Exit gate**
- Added input improves a defined task and does not make pointer movement less predictable.
- A user can disable it independently.

### Phase 7 — Optional BCI research

**Deliverables**
- A separate research note describing a supported non-invasive signal source, the signal classification task, setup, limitations, and risks.
- One tightly scoped, low-risk experiment only if hardware and supervision are appropriate.

**Exit gate**
- No thought-reading claims.
- No destructive actions.
- The rest of ORBIT remains useful when the BCI module is absent or disconnected.

## 2. Core test plan

Tests should be repeatable and recorded as observations/results, not assumptions.

### Camera and landmarks

- [ ] Camera unavailable at startup.
- [ ] Camera used by another app.
- [ ] Low light, backlighting, and ordinary room light.
- [ ] Hand enters/leaves the frame.
- [ ] Hand rotates and partially occludes fingers.
- [ ] Left/right hand selection.
- [ ] Five-minute continuous tracking test.

### Pointer

- [ ] Four calibration corners are reachable.
- [ ] Large target movement.
- [ ] Small precision movement.
- [ ] Pointer freezes on low confidence.
- [ ] Pointer does not jump to a random edge when tracking is lost.
- [ ] External display selected intentionally.
- [ ] Physical mouse can take over immediately.

### Gestures

- [ ] Normal pointing produces movement only.
- [ ] One left pinch produces no more than one left click.
- [ ] Right click remains distinguishable from left click.
- [ ] Scroll mode does not generate clicks.
- [ ] Quick finger changes do not cause repeated actions.
- [ ] No hand / low confidence never triggers a click.
- [ ] Optional drag releases after tracking loss or pause.

### Safety and recovery

- [ ] `OFF` remains the default after reboot.
- [ ] Emergency stop works during active pointer mode.
- [ ] Emergency stop works when the UI is covered by another app.
- [ ] Camera unplugged during use.
- [ ] Python service crashes.
- [ ] Desktop shell crashes or closes.
- [ ] No held synthetic button remains pressed after stop/crash.
- [ ] App never requests admin privileges just to move the cursor.
- [ ] No raw camera images appear in local logs or settings.
- [ ] Unknown protocol messages are rejected.

### Usability

- [ ] User can explain the current mode from the HUD.
- [ ] User can disable the camera without hunting through menus.
- [ ] User can return to normal mouse control without restarting Windows.
- [ ] Ten-minute session completed without a stuck button or unwanted high-impact action.

## 3. Initial measurable targets

These are engineering goals to validate and revise from real tests:

| Metric | Initial target | How to measure |
|---|---|---|
| Tracking preview frame rate | Aim for 20–30 FPS at a practical camera resolution | Measure completed processing frames over a timed test |
| Pointer response | Target under 120 ms end-to-end | Record controlled movement and the time until visible cursor response, using a repeatable measurement method |
| Single-click reliability | At most one click per deliberate pinch | Count emitted click events against a scripted set of trials |
| Stuck input | Zero stuck synthetic buttons in the test suite | Track adapter button state through pause, hand loss, shutdown, and crash tests |
| False clicks | Aim for zero during a 10-minute idle/normal-movement test; any false click blocks release | Record all click events during a defined no-click scenario |
| Privacy | Zero raw frame writes/uploads by default | Inspect application code paths, logs, and network behaviour during tests |
| Recovery | Manual re-arm required after faults | Force crash/restart and verify state remains off/paused |

Do not publish these as achieved performance until tests have produced results on the actual hardware.

## 4. Development practices

- Keep commits small and label the tested phase.
- Separate vision landmark tests from Windows input tests.
- Start with synthetic test coordinates before connecting real input events.
- Put safety-state tests in automated tests where feasible.
- Make debug overlays opt-in and never expose raw camera frames to the renderer unless necessary for a local calibration view.
- Pin dependencies and document installation commands when the prototype is reproducible.
- Add a rollback path for user settings.
- Avoid adding online services or telemetry merely because they are easy to integrate.

## 5. Release checklist

- [ ] All five project documents agree with the implemented controls.
- [ ] Install/run/stop instructions are tested from a clean state.
- [ ] Camera indicator and stop action are visible and reliable.
- [ ] All failure paths disable future synthetic input.
- [ ] No raw video/audio is stored or uploaded by default.
- [ ] Logs contain no personal screen content or camera frames.
- [ ] Performance results come from tests, not guesses.
- [ ] Known limitations and supported Windows environment are documented.
- [ ] No later-phase eye/voice/BCI feature is a prerequisite for hand-control use.

## 6. First coding session: exact order

1. Create the repo and a minimal Electron/React/TypeScript window.
2. Create the Python vision service with a start/stop command.
3. Verify camera open/close behaviour and display a hand-landmark preview.
4. Add a typed local protocol and show tracking state in the UI.
5. Add the state machine and emergency stop **before** any mouse injection.
6. Test pointer-only movement with large targets.
7. Add one click gesture, test it thoroughly, then add right-click and scroll.

**Do not start with an animated HUD or neural-control module. Build the reliable input path first; the futuristic interface sits on top of that.**

## 7. Reference documentation

- MediaPipe Hand Landmarker: https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/HandLandmarker
- Windows input injection (`SendInput`): https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput
- Windows Voice Access: https://support.microsoft.com/en-us/accessibility/windows/voice-access/use-voice-access-to-control-your-pc-author-text-using-your-voice
- Windows Eye Control: https://support.microsoft.com/en-us/accessibility/windows/eye-control/get-started-with-eye-control-in-windows
- OpenBCI docs for later BCI research: https://docs.openbci.com/
