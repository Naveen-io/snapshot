# FROSTEX ORBIT
## Document 03 — Interaction, Gesture & Control Specification

**Status:** Foundational draft v0.1  
**Primary input in v1:** One-hand webcam tracking  
**Design rule:** A gesture should have one obvious meaning, provide visual feedback, and never silently trigger a high-impact action.

---

## 1. Control modes

| Mode | Camera | Cursor/OS actions | Purpose |
|---|---|---|---|
| `OFF` | Closed | None | Privacy-first default |
| `PREVIEW` | Active | None | Test camera framing and hand visibility |
| `CALIBRATION` | Active | Calibration UI only | Map hand movement to one display |
| `POINTER` | Active | Approved mouse actions only | Normal hand-controlled mouse |
| `PAUSED` | May remain active only if the user chose pause-with-preview | None | Stop movement/actions immediately |
| `ERROR` | Shut down when feasible | None | Any critical fault |

### Mode transitions

- Default after install and Windows sign-in: `OFF`.
- User opens ORBIT and selects Preview: `PREVIEW`.
- User presses the configured arm shortcut from inside ORBIT or through the registered global hotkey: run readiness checks, then ask for an explicit entry to `POINTER`.
- User can pause at any time using the global pause shortcut, a visible HUD control, or a physical mouse/keyboard override.
- Camera loss, service crash, invalid coordinates, or an input-adapter failure immediately blocks new actions and transitions to `PAUSED` or `ERROR`.
- Restarting the service never automatically re-arms the pointer.

## 2. Default shortcut proposal

The following are provisional and configurable. We must check that chosen combinations do not conflict with the user's existing apps or games.

- `Ctrl + Alt + G` — show ORBIT / toggle hand-control readiness.
- `Ctrl + Alt + Backspace` — emergency stop: disable synthetic input and release every held synthetic button.
- `Esc` — close calibration/practice overlays or pause when ORBIT is focused.
- A visible HUD stop/pause control duplicates the emergency action.

**Important:** do not rely on a gesture as the only emergency stop. A keyboard shortcut and ordinary mouse control remain available.

## 3. Pointer mapping

### Default approach

- Track the index fingertip as the primary control point.
- Calibrate a rectangular working area for one selected display.
- Convert camera coordinates into normalized screen coordinates, then into the selected display's coordinates.
- Mirror the preview for intuitive movement, but make the mapping setting explicit and test the final cursor direction.
- Apply smoothing that reduces camera jitter without making the pointer feel delayed.
- Provide sensitivity and acceleration settings, including a slower precision mode.
- Add configurable edge dead-zones to prevent a small accidental hand movement from driving the pointer to a screen corner.
- Keep multi-monitor mapping out of the first successful prototype. Add it only after single-display behaviour is reliable.

### Pointer confidence behaviour

- With high confidence: move normally.
- With medium confidence: increase smoothing and avoid gesture transitions.
- With low confidence: freeze movement; do not click.
- With no hand: freeze pointer; after the loss timeout, release held synthetic buttons and enter pause.

## 4. Gesture grammar

Gestures must be implemented as finite states with enter/exit thresholds, not as raw per-frame classifications. Exact numerical thresholds should be calibrated on-device and tuned from tests.

| Gesture | Intended action | Safety/rules |
|---|---|---|
| Index finger pointing | Move pointer | No click side effect; smooth movement; requires `POINTER` mode |
| Thumb + index pinch | Left click on pinch transition | One click per pinch transition; minimum stable-frame/debounce window |
| Thumb + middle-finger pinch | Right click on pinch transition | Must be sufficiently distinct from the left-click pinch |
| Index + middle fingers extended (scroll mode) | Scroll with vertical hand movement | Ignore click gestures while this mode is active; cap scroll speed |
| Pinch held deliberately | Optional drag, after it is proven safe | Disabled in earliest MVP; require distinct hold duration and reliable release handling |
| Double pinch | Optional double-click | Later feature; reject if confidence drops or the timing is ambiguous |

A closed fist, wave, or open palm must **not** launch programs, delete data, or execute system commands by default. These gestures can be reserved for low-risk UI mode changes after false-trigger testing.

## 5. Click and drag safety

- Click only on the gesture's transition from released to pinched; do not repeat clicks while the pinch remains held.
- Require the gesture to be stable for a configurable number of frames/time window.
- Add a short cooldown to prevent one pinch from becoming several clicks.
- In v1, implement single-click and right-click before drag or double-click.
- When drag is later enabled, use a deliberate hold threshold and visible `DRAGGING` state.
- If tracking disappears while dragging or a mouse button is down, release all synthetic buttons after a short safety timeout.
- If the user physically moves a mouse or presses the emergency shortcut, cancel the gesture and release the synthetic button.

## 6. Scrolling behaviour

- Enter scroll mode only when the required finger pattern is stable.
- Translate vertical movement into a capped scroll delta.
- Apply smoothing and a dead-zone to prevent tremor from scrolling.
- Do not interpret cursor motion as scroll while scroll mode is off.
- Show a small `SCROLL` indicator while active.

## 7. Calibration and practice

The first-run calibration must be short and recoverable:

1. Explain camera positioning and lighting in plain language.
2. Show the hand in preview with a landmark skeleton; do not send OS input.
3. Ask the user to point at four on-screen calibration targets.
4. Check whether all corners can be reached without leaving the camera frame.
5. Let the user select their preferred hand, pointer speed, smoothing, and display.
6. Run a practice exercise with isolated targets for movement, left click, right click, scroll, and pause.
7. Ask the user to explicitly enable pointer mode after practice.

If calibration quality is poor, show how to reposition the laptop/camera or change the working area. Do not label a weak calibration as successful merely to complete onboarding.

## 8. HUD feedback

The HUD should always answer:

- Is ORBIT off, previewing, active, paused, or in error?
- Is the camera available and currently in use?
- Is a hand detected?
- Which monitor is controlled?
- Which gesture mode is active?
- Is the input paused, and how can the user resume?

Only show confidence percentages, FPS, or latency if those values are genuinely computed and labelled correctly. A confidence value is the model's confidence estimate, not a guarantee that a gesture is correct.

## 9. Voice-control contract (later phase)

- Begin with a small allowlist such as opening a configured app, pausing ORBIT, changing ORBIT mode, or starting a timer.
- Prefer OS-native accessibility features for general Windows voice control before building a competing full speech-control engine.
- Use a clear wake/activation action rather than continuously treating nearby speech as commands.
- Display or speak back the action before a high-impact operation.
- Do not allow arbitrary natural-language-to-shell execution.
- Destructive commands, file deletion, account/security changes, and system-level modifications remain excluded from gesture macros and require normal manual interaction.

## 10. Eye/head input contract (later phase)

- Webcam face landmarks may support head-pose experiments or coarse focus navigation, but ordinary webcam gaze estimates are not promised to be pixel-accurate.
- Gaze can be used to suggest a region; clicking should require an intentional confirmation gesture or dwell policy with visible feedback.
- Dedicated eye-control hardware must be detected and calibrated before it is used.
- Eye tracking is optional: the system must still be fully usable with hand + keyboard + mouse.

## 11. Neural input contract (research-only)

- Treat BCI as a separate research adapter, not a dependency of desktop control.
- Interpret only a small set of trained, explicitly intended signals if a safe and supported setup proves viable.
- Never describe it as direct mind reading.
- No invasive devices, DIY electrical stimulation, or medical claims are part of this project.
- Do not let experimental BCI signals execute destructive actions. At most, begin with a visible toggle or a low-risk selection requiring a second confirmation.

## 12. Interaction acceptance checklist

- [ ] User can switch to `OFF` from every state.
- [ ] Pointer control cannot start by itself after boot or restart.
- [ ] One pinch produces at most one click.
- [ ] A dropped hand does not produce a click.
- [ ] A lost camera releases all synthetic mouse buttons.
- [ ] Keyboard/mouse emergency control works even if gestures are misclassified.
- [ ] No gesture can run arbitrary shell commands or delete files.
- [ ] The HUD gives clear feedback for every mode transition.
