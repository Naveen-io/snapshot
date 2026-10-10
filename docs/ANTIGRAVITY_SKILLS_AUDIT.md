# ANTIGRAVITY SKILLS & CAPABILITY AUDIT — FROSTEX ORBIT

**Audit Date:** 2026-10-10  
**Target Environment:** Windows 11 Pro 64-bit (10.0.26300), 11th Gen Intel Core i5-11400H @ 2.70GHz, NVIDIA GeForce GTX 1650 (4GB) + Intel UHD Graphics, 16 GB RAM, HD User Facing Webcam (0408:a061), Node v24.18.0, npm 11.16.0, Python 3.14.3 (OpenCV 5.0.0, MediaPipe 0.10.35, NumPy 2.5.0).

---

## 1. Discovered Skills Inventory

| Skill Name | Source / Path | Description / Capabilities | Relevance to ORBIT | Status & Application |
|---|---|---|---|---|
| **antislop** | `C:\Users\ACER\.gemini\config\plugins\antislop\skills\antislop\SKILL.md` | Core anti-slop rules for AI agents: prohibits generic AI design tropes, fake data, dead buttons, unverified metrics; requires purpose-driven design. | **CRITICAL** | **Read & Applied**: Active mode set to `during` (session override). Enforces no fake FPS/telemetry, honest states, WCAG contrast. |
| **antislop-ui** | `C:\Users\ACER\.gemini\config\plugins\antislop\skills\antislop-ui\SKILL.md` | Deep dive on UI: bans purple/neon defaults, excessive glassmorphism, decorative pulsing dots, pill-everything styling, fake terminals. | **CRITICAL** | **Read & Applied**: Enforces dark matte charcoal aesthetic, single cyan accent, clean HUD hierarchy, real status indicators. |
| **antislop-code** | `C:\Users\ACER\.gemini\config\plugins\antislop\skills\antislop-code\SKILL.md` | Code comment hygiene: prevents generic AI-slop comments, banners, obvious echoes; preserves architecture, safety, and protocol rationale. | **CRITICAL** | **Read & Applied**: Clean, high-signal comments in TypeScript and Python; preserves critical safety invariants. |
| **antislop-human** | `C:\Users\ACER\.gemini\config\plugins\antislop\skills\antislop-human\SKILL.md` | Accessibility, keyboard focus, WCAG AA contrast (4.5:1 text, 3:1 components), states for real humans. | **HIGH** | **Read & Applied**: Ensures HUD is operable via keyboard, contrast passes WCAG AA, clear focus outlines. |
| **antislop-layoutmobile**| `C:\Users\ACER\.gemini\config\plugins\antislop\skills\antislop-layoutmobile\SKILL.md`| Responsive layout standards, tap targets (44px), overflow prevention. | **MEDIUM** | **Read & Applied**: Applied to compact HUD layout, responsive cards, and settings drawers. |
| **antislop-copywriting** | `C:\Users\ACER\.gemini\config\plugins\antislop\skills\antislop-copywriting\SKILL.md` | Natural human copywriting, bans em dashes (`—`), buzzwords, fake statistics. | **HIGH** | **Read & Applied**: Applied to all user-facing UI labels, error messages, and documentation. |
| **taste-design** | `C:\Users\ACER\.gemini\config\skills\taste-design\SKILL.md` | Semantic design system rules for anti-generic, high-agency interfaces: strict typography, calibrated color, hardware acceleration. | **HIGH** | **Read & Applied**: Incorporated into ORBIT HUD design tokens (`#0c0f12` canvas, `#00e5ff` cyan, typography scale). |
| **shadcn-ui** | `C:\Users\ACER\.gemini\config\skills\shadcn-ui\SKILL.md` | Accessible component primitives and design tokens. | **MEDIUM** | **Read & Applied**: Used as reference for accessible modal, toggle, and slider primitives in React. |
| **agy-customizations** | `C:\Users\ACER\.gemini\antigravity\builtin\skills\agy-customizations\SKILL.md` | Guide for workspace rules, skills discovery, loading order, and plugin extensions. | **MEDIUM** | **Read & Applied**: Used to establish workspace-local `.agents/skills/orbit-engineering/SKILL.md`. |
| **antigravity-guide** | `C:\Users\ACER\.gemini\antigravity\builtin\skills\antigravity_guide\SKILL.md` | Reference for IDE tools, CLI, keybindings, and subagents. | **LOW** | Read reference; no direct runtime code dependency. |
| **react-vite-dashboard** | `C:\Users\ACER\.gemini\config\skills\react-vite-dashboard\SKILL.md` | Patterns for Vite + React dashboards with high responsiveness. | **MEDIUM** | Applied to Electron renderer Vite build structure. |
| **ui-extension** | `C:\Users\ACER\.gemini\antigravity\builtin\skills\ui-extension\SKILL.md` | Interactive side pane web panels for IDE. | **LOW** | Evaluated; ORBIT is a standalone Windows desktop app, not an IDE side pane. |
| **stitch-loop**, **design-md**, **site-md**, **remotion**, etc. | Various Stitch and video utilities in `~/.gemini/config/skills/` | Stitch screen generation and video walkthrough tools. | **LOW** | Evaluated; not used for native Windows desktop input engine. |
| **android-cli** | `~/.gemini/config/plugins/android-cli-plugin/` | Android SDK and CLI management. | **NONE** | Irrelevant for Windows desktop application. |
| **orbit-engineering** (Local) | `d:\E.V\.agents\skills\orbit-engineering\SKILL.md` | Workspace-local engineering invariants, safety gates, and architecture boundaries for ORBIT. | **CRITICAL** | **Created & Active**: Governs all code and tests in this workspace. |

---

## 2. Tools & MCP Servers Audit

- **Terminal / Shell Tools**: PowerShell on Windows 11 x64 (`run_command`), supporting direct package management, system diagnostics, and background task management (`manage_task`).
- **File System Tools**: `view_file`, `write_to_file`, `replace_file_content`.
- **MCP Server `stitch`**: Lazy-loaded server for web UI generation. Evaluated; desktop application is built with native Electron + Vite + Python rather than external Stitch designs to guarantee 100% offline local-first operation.
- **Subagents**: `self` and `research` subagents available via `invoke_subagent` for parallel verification.

---

## 3. Active Directives & Compliance Strategy
1. **Design System & Antislop**: Dark matte charcoal (`#0c0f12`), dark card surfaces (`#14191f`), crisp cyan accent (`#00e5ff`), no generic purple glow, no fake charts, no em dashes in UI text, real metrics only.
2. **Safety Architecture**: Strictly separate Python computer vision from Windows `SendInput` execution; guard all inputs behind the central `OFF` / `PREVIEW` / `CALIBRATION` / `POINTER` / `PAUSED` / `ERROR` state machine.
3. **Local Privacy**: Zero frame storage, zero telemetry, localhost 127.0.0.1 socket communication with session token authentication.
