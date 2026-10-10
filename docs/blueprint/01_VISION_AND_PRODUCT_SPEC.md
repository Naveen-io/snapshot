# FROSTEX ORBIT
## Document 01 — Vision & Product Specification

**Status:** Foundational draft v0.1  
**Project type:** Windows-first personal spatial-computing interface  
**Codename:** FROSTEX ORBIT (renameable)  
**Primary design cue:** A practical, original sci-fi assistant experience inspired by futuristic suit interfaces—not a replica of any film UI.

---

## 1. The big idea

FROSTEX ORBIT is a personal control layer for a Windows PC. It makes ordinary computing feel closer to a futuristic workstation by combining a restrained on-screen HUD, camera-based hand control, voice commands, optional head/eye input, and eventually carefully scoped experiments with non-invasive brain-computer interfaces.

The goal is not to pretend that the computer has supernatural intelligence. The goal is to make useful actions faster, make controls easier to reach, and let multiple input methods work together without fighting each other.

### One-sentence product definition

> A local-first Windows control system that lets the user operate the desktop through a hand-tracked pointer, explicit gestures, voice, and an elegant live HUD—with optional advanced sensors added only when they demonstrably help.

## 2. The experience we want

When ORBIT is running, the user should be able to:

- Press a shortcut to enter **Hand Pointer Mode**.
- See a clear on-screen indicator that the camera and pointer are active.
- Move a cursor with an index-finger point, using calibration and smoothing that reduce shaking.
- Pinch to click, use a distinct gesture to right-click, and use a deliberate gesture to scroll.
- Pause control immediately with a keyboard shortcut or the app's visible stop control.
- Trigger a small set of explicitly configured actions by voice or gesture.
- See real status information: input mode, camera state, detection state, and measured frame rate where available.
- Keep camera frames on the PC and avoid recording or uploading them by default.

## 3. Product principles

1. **Actually usable beats visually impressive.** A steady pointer is more valuable than a flashy hologram.
2. **Local-first by default.** Camera processing and settings stay on the user's computer unless a future feature clearly requires an external service and the user explicitly enables it.
3. **Every control has a visible state.** The user must always know whether hand input is off, armed, active, paused, or calibrating.
4. **Never trap the user.** A physical mouse, keyboard, Escape route, and emergency pause always take priority.
5. **No accidental destructive actions.** Opening a program is different from deleting files, running shell commands, or changing security settings. High-impact actions are excluded or require explicit confirmation.
6. **Measure, don't fake.** Show actual tracking state and measured performance; do not invent system metrics or claim perfect detection.
7. **Modular, not monolithic.** Hand tracking must work without eye tracking, voice must work without hand tracking, and future sensors must be optional.
8. **Low-distraction design.** Matte charcoal/black, clean typography, subtle cyan/white highlights, compact rounded panels, restrained motion, no purple-heavy theme, no unnecessary 3D glass effects.

## 4. Target environment

Initial target is the user's Windows 11 PC: Acer Nitro V laptop, Intel Core i5, NVIDIA GTX 1650, 16 GB RAM, and an external monitor. The actual webcam position, resolution, lighting, and display arrangement must be tested rather than assumed.

The first version should not require a new camera, eye tracker, wearable, cloud account, or custom electronics. If the built-in webcam cannot see the hand reliably from the user's normal position, the project should document that limitation before recommending purchases.

## 5. Feature scope

### Version 0 — Proof of concept

- Live camera preview with hand landmarks for debugging.
- Stable detection of one hand.
- No synthetic mouse events until the user explicitly turns on pointer control.
- A visible pause/stop state.

### Version 1 — Useful hand-controlled mouse

- Calibrate pointer mapping to one selected display.
- Index-finger pointer control with smoothing and adjustable sensitivity.
- Thumb-index pinch for left click.
- A distinct, debounced right-click gesture.
- Two-finger scroll mode.
- Safe release of held mouse buttons if tracking is lost.
- Physical mouse and keyboard remain usable at all times.

### Version 2 — ORBIT interface

- Compact HUD and tray app.
- Calibration wizard and gesture practice screen.
- Profiles for sensitivity, handedness, and selected display.
- Genuine status indicators and a local event log that never stores camera frames.
- Optional hand-control shortcuts for common, allowlisted actions.

### Later modules

- Local voice-command layer beyond built-in Windows Voice Access.
- Head-pose experiments and optional gaze input.
- Dedicated eye-tracker integration where hardware and SDK access are available.
- Non-invasive BCI research only after the desktop controls are stable and useful.

## 6. Non-goals

- Reading arbitrary thoughts or claiming to know what the user intends without an input signal.
- Replacing every keyboard shortcut or mouse use case in the first release.
- Creating an actual augmented-reality view outside the display, or requiring AR glasses.
- Recording the room, streaming the webcam, or saving raw camera footage by default.
- Running unreviewed shell commands, deleting files, or changing system security settings from vague spoken phrases.
- Copying copyrighted Spider-Man/EDITH/JARVIS artwork, sounds, names, or exact interface layouts. The design can use broad science-fiction inspiration while remaining original.

## 7. Definition of success

The first meaningful success is not a video demo. It is a repeatable 10-minute session where the user can move the pointer, click a target, scroll, pause instantly, and fall back to a normal mouse without a stuck button or unwanted action.

Performance targets and exact acceptance tests are defined in Document 05 and must be measured on the actual machine.

## 8. Document set

- `01_VISION_AND_PRODUCT_SPEC.md` — what ORBIT is and what it is not.
- `02_SYSTEM_ARCHITECTURE.md` — modules, stack, and data flow.
- `03_INTERACTION_AND_GESTURE_SPEC.md` — exact input behaviours and control states.
- `04_HARDWARE_FEASIBILITY_AND_SAFETY.md` — equipment, real limitations, privacy, and safety.
- `05_BUILD_ROADMAP_AND_TEST_PLAN.md` — implementation order, measurable gates, and release checklist.

**Rule for the build:** Do not implement future-stage features early just because they sound exciting. Complete and test one control path at a time.
