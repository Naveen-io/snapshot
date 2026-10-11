# Hyperframes Composition Brief: SNAPSHOT Launch Film

## Objective
Create a short, Apple-inspired cinematic launch film for SNAPSHOT, turning raw screen captures into App Store presentations in seconds.

## Output
- Composition directory: `snapshot-launch-film/composition/`
- Rendered video: `snapshot-launch-film/brag.mp4`
- Format: vertical — 1080x1920 (9:16)
- Duration: 20 seconds (30fps, 600 frames)

## Source Material
- Project root: `D:\E.V`
- Primary files read: `src/shared/constants.ts`, `src/shared/types.ts`, `public/icon.png`, `brag-plan.md`
- Product name: Snapshot
- Tagline / strongest claim: "Your app. In its best light." / "Turn raw captures into App Store presentations in seconds."
- Key UI / visual moments to feature:
  - High-precision smartphone device chassis (titanium bezel, Dynamic Island pill cutout, subtle specular reflection).
  - Snapshot design presets: "Velvet Sunset", "Obsidian Luxe", "Clean Editorial".
  - Floating pill badge: "Exported • Lossless 4K PNG".
  - Snapshot official icon and tracked logo typography.
- Copy that must appear verbatim:
  - "Your app."
  - "Make it look the part."
  - "Device framing. In seconds."
  - "Exported • Lossless 4K PNG"
  - "SNAPSHOT"
  - "Your app. In its best light."

## Creative Direction
- Tone preset: `polished`
- Creative direction: Apple product launch film — minimalist industrial design, restrained editorial typography, white studio photography, physically believable motion.
- Interpretation: Generous negative space, deliberate alignment, balanced proportions, studio lighting, smooth GSAP transitions.
- Hook: 0.0s to 3.2s: "Your app." ... "Make it look the part." on pure white studio background.
- Outro: 18.0s to 20.0s: Snapshot icon + wordmark + "Your app. In its best light."
- Avoid:
  - Generic SaaS buzzwords
  - Abstract filler graphics
  - Rainbow clown aesthetics or hyperactive jarring cuts

## Visual Identity
- Studio Background: `#FFFFFF`
- Studio Surfaces: `#F5F5F7`
- Typography: `Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`
- Text Primary: `#1D1D1F` (high contrast on white)
- Text Secondary: `#6E6E73`
- Accent: `#0071E3`
- Preset Palettes:
  - Velvet Sunset: `linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)`
  - Obsidian Luxe: `linear-gradient(135deg, #090d16, #111827, #1f2937)`
  - Clean Editorial: `linear-gradient(135deg, #f3f4f6, #e5e7eb, #d1d5db)`

## Storyboard
Follows the storyboard in `brag-plan.md`:
1. Scene 1 — The Hook (0.0s–3.2s): Pure white, "Your app." → "Make it look the part."
2. Scene 2 — The Raw Capture (3.2s–6.0s): Authentic raw mobile app screenshot in mid-air.
3. Scene 3 — Hero Transformation (6.0s–11.2s): Screenshot elevates, titanium phone chassis wraps around it, Velvet Sunset backdrop blooms, soft elevation drop shadow resolves. Copy: "Device framing. In seconds."
4. Scene 4 — Design Presets (11.2s–15.2s): Rhythmic carousel through Velvet Sunset, Obsidian Luxe, and Clean Editorial with style pills.
5. Scene 5 — Ready For The World (15.2s–17.8s): Settle at delicate 3D perspective angle, frosted badge pops: "Exported • Lossless 4K PNG".
6. Scene 6 — Brand Mark & Resolution (17.8s–20.0s): Pure white dissolve, Snapshot icon + wordmark + "Your app. In its best light."

## Audio
- Role: Warm, refined electronic bed with restrained, tactile UI SFX.
- Audio arc: Ambient musical groove that builds gently, maintains steady momentum, and settles with a warm resonant logo chime.
- Music: `assets/music/bgm.mp3` (`happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`), volume 0.28, fade-out starting at 18.2s.
- SFX:
  - `assets/sfx/interface/drop_001.ogg` at 6.2s (volume 0.6) for phone chassis lock.
  - `assets/sfx/ui/switch1.ogg` at 11.2s and 12.6s (volume 0.5) for preset switching.
  - `assets/sfx/interface/click_001.ogg` at 16.5s (volume 0.6) for export confirmation.
  - `assets/sfx/impact/impactBell_heavy_000.ogg` at 18.2s (volume 0.55) for brand resolution.

## Hyperframes Instructions
- Standalone 1080x1920 portrait composition in `index.html`.
- Paused timeline registered to `window.__timelines["main"]`.
- Ensure all text has sufficient contrast against its immediate background.
- Test with `npm run check` and ensure 0 errors.
