# FROSTEX ORBIT
## Document 04 — Hardware, Feasibility, Privacy & Safety

**Status:** Foundational draft v0.1  
**Rule:** Start with hardware already owned; buy nothing until testing proves a genuine bottleneck.

---

## 1. Existing baseline

Known starting machine: Acer Nitro V laptop, Intel Core i5, NVIDIA GTX 1650, 16 GB RAM, Windows 11, with an external monitor. The built-in webcam and microphone are the first input devices to test. The actual webcam quality, angle, display resolution, and lighting are still unknown and must be checked on the machine.

### Minimum initial requirements

- Windows 11 desktop session.
- Working webcam visible to the application.
- Adequate front lighting and a background that allows the hand to be distinguished.
- Enough space in the camera frame for the user's chosen hand movements.
- Keyboard available for emergency pause and ordinary navigation.

### Setup recommendations

- Put the webcam at or near the display's top edge and roughly facing the user's normal sitting position.
- Keep the hand inside the camera frame without forcing an uncomfortable arm position.
- Use diffuse front lighting; avoid bright backlighting that silhouettes the hand.
- Begin with one controlled display. Multi-monitor support adds coordinate-mapping complexity and should be tested separately.
- If the camera is built into a laptop below or to the side of the external monitor, test whether the hand stays visible during normal use before designing around it.

## 2. Feasibility by input method

| Input method | Practicality | Hardware needed now? | Project decision |
|---|---|---|---|
| Webcam hand landmarks | Good first experiment; quality varies with lighting, framing, camera quality, and hand occlusion | Existing webcam may be enough | Build first and measure |
| Hand-controlled pointer | Feasible using landmarks plus native OS input; cursor stability will need careful tuning | Webcam + display | MVP priority |
| Voice control | Windows 11 Voice Access can control apps, interact with on-screen items, and dictate text; setup and language availability matter | Microphone | Use built-in Voice Access as a baseline before custom voice code |
| Head pose | Possible to estimate from face landmarks; precision and comfort require testing | Webcam | Optional experiment after pointer MVP |
| Eye gaze from ordinary webcam | Coarse experiments are possible, but reliable pixel-level gaze control is not guaranteed | Webcam, with significant software caveats | Do not promise as a main pointer in v1 |
| Dedicated eye tracking | More appropriate for calibrated gaze control, but specific supported devices/software are required | Compatible tracker | Optional, only after hand MVP and budget review |
| Non-invasive BCI/EEG | Research-oriented, calibration and signal interpretation are significant challenges; not a general-purpose thought reader | A supported research setup and trained workflow | Research only; last phase; no purchase now |

## 3. Existing Windows features worth using

### Voice Access

Windows 11 Voice Access supports voice control for opening and switching apps, using on-screen controls, and text dictation. Microsoft states that it can work offline after the required initial setup/download. It is a useful baseline for hands-free desktop use and means ORBIT does not need to recreate every voice feature in the first version.

Official guide: https://support.microsoft.com/en-us/accessibility/windows/voice-access/use-voice-access-to-control-your-pc-author-text-using-your-voice

### Windows Eye Control

Windows Eye Control supports particular compatible eye-tracking devices and selected integrated hardware. Microsoft's documented device list includes Tobii and EyeTech models and selected systems; a generic webcam should not be assumed to work as a supported Eye Control device.

Official setup guide: https://support.microsoft.com/en-us/accessibility/windows/eye-control/get-started-with-eye-control-in-windows

### Tobii Eye Tracker 5

Tobii publishes hardware specifications and supported operating-system details for Eye Tracker 5. Before considering it, verify current availability, software support, exact display compatibility, local pricing, and whether it provides the API/integration required for ORBIT. Do not buy it merely because it is named here.

Official specifications: https://help.tobii.com/hc/en-us/articles/360012483818-Specifications-for-Eye-Tracker-5

## 4. Brain-computer interface: reality check

A brain-computer interface measures signals and maps detected patterns to trained outputs. Depending on the hardware and method, this may support a limited set of choices or intentional control patterns after setup and calibration. It does **not** give a computer unrestricted access to thoughts or intentions.

For this project:

- BCI is not part of the first build and must not delay useful pointer control.
- Do not buy a headset until a specific, documented experiment, software path, and realistic cost have been reviewed.
- Use only non-invasive, supported equipment in a conventional supervised research/learning setup.
- No electrical stimulation, invasive hardware, medical diagnosis/treatment, or DIY device modifications.
- Do not use a noisy experimental signal to trigger destructive operations. Start with a visible mode toggle or low-risk action that requires a second confirmation.
- If the experiment involves physical equipment, involve a knowledgeable adult and follow the manufacturer's instructions.

OpenBCI documentation is a research reference, not a recommendation to purchase any particular board: https://docs.openbci.com/

## 5. Privacy-by-design requirements

- The camera is off by default.
- Show a visible camera-active indicator whenever frames are being read.
- Process video locally for the initial releases.
- Never save, upload, or stream raw camera frames by default.
- Keep diagnostic logs to events and errors (for example, “tracking lost”), not video, images, audio, or personal content.
- Do not start webcam capture silently at Windows sign-in.
- Provide clear settings to choose camera and stop it.
- Do not add telemetry/analytics without a separate, explicit, informed opt-in.
- Use a local-only communication channel between app components and reject malformed messages.

## 6. Safety-by-design requirements

- Emergency keyboard shortcut and visible stop control always outrank gesture input.
- Physical mouse and keyboard remain usable.
- The app starts in `OFF` after reboot, crash, and restart.
- If the hand disappears while a synthetic button is held, release the button on timeout.
- No admin requirement by default.
- No arbitrary shell, PowerShell, or command execution from voice/gesture input.
- Keep all actions in a reviewed allowlist.
- High-impact system changes are excluded from gesture macros.
- Clearly explain when Windows blocks input into a higher-integrity application; do not instruct the user to weaken Windows security controls just to force it to work.

## 7. Compatibility and testing risks

| Risk | What it looks like | Mitigation |
|---|---|---|
| Poor lighting or hand occlusion | Landmarks jump or disappear | Improve lighting/framing, lower camera resolution, use confidence gating |
| Cursor jitter | Small hand motion causes cursor shake | Smoothing, dead-zone, calibration, precision mode |
| Pointer latency | Cursor trails far behind hand | Tune frame resolution/rate and smoothing; measure full path latency |
| False click | A gesture is mistaken for a pinch | Separate thresholds, stable-frame window, debounce, preview/training mode |
| Multi-monitor confusion | Cursor jumps to wrong display/coordinates | One display in MVP; explicit display selection and independent calibration later |
| Camera resource conflict | Another application owns the webcam | Show error, release camera cleanly, allow retry |
| Elevated target window | Native input is ignored in some apps | Document OS boundary; don't auto-elevate ORBIT |
| Service crash | Pointer stops or button state is uncertain | Stop input, release synthetic buttons, display `ERROR`, require manual re-arm |
| Eye-tracking mismatch | Device is unsupported or calibration fails | Check the official compatibility list and current vendor software first |
| BCI overclaim | Marketing promises thought-reading | Use careful language; define measurable trained signals and limits |

## 8. Official references

- Microsoft Voice Access: https://support.microsoft.com/en-us/accessibility/windows/voice-access/use-voice-access-to-control-your-pc-author-text-using-your-voice
- Microsoft Eye Control setup: https://support.microsoft.com/en-us/accessibility/windows/eye-control/get-started-with-eye-control-in-windows
- Tobii Eye Tracker 5 specifications: https://help.tobii.com/hc/en-us/articles/360012483818-Specifications-for-Eye-Tracker-5
- MediaPipe Hand Landmarker: https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/HandLandmarker
- OpenBCI documentation: https://docs.openbci.com/
