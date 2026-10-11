<<<<<<< HEAD
# SNAPSHOT
### Premium Windows 11 Screenshot, Visual Comparison & Documentation Workspace

SNAPSHOT is a high-performance Windows 11 desktop application engineered with a single guiding principle:
**Capture instantly. Edit only when needed. Never interrupt the user's workflow unnecessarily.**

---

## ⚡ Next-Generation Workspace Suite

### 1. 🔍 Visual Diff Studio (Feature 1)
- **Compare Any Two Screenshots**: Load directly from local capture history or import files from disk.
- **Multiple Comparison Modes**:
  - **Split Slider**: Drag before/after comparison divider with live percentage indicator.
  - **Side-by-Side**: Direct synchronized comparison of two visual states.
  - **Opacity Overlay**: Smooth cross-fade blending from 0% to 100% opacity.
  - **Difference Heatmap**: Local pixel-difference engine calculating Euclidean color distances.
- **Changed Region Detection**: 32×32 pixel cell clustering identifies changed UI bounding boxes.
- **Configurable Thresholds**: Adjustable sensitivity slider (0.01 to 0.40) and customizable highlight colors (Red, Magenta, Cyan, Yellow).
- **Dimension Normalization**: Intelligent pad, scale, and crop alignment for comparing screenshots of differing resolutions.
- **Instant Export**: Copy difference image to clipboard or save directly to disk.

### 2. 📖 Screenshot Flow Guides (Feature 2)
- **Step-by-Step Documentation Builder**: Produce procedural, illustrated instructions in seconds.
- **Multi-Step Management**: Capture steps live via global hotkeys, pick from recent history, or import image files.
- **Reordering & Editing**: Drag-and-drop or one-click Up/Down reordering with automatic 1-indexed badge renumbering.
- **Full Metadata Controls**: Editable step title, multi-line procedural description, screenshot caption, and custom badge color swatches.
- **Zero-Dependency Offline Exporters**:
  - **Vector PDF Guide**: Generated offline via Chromium `webContents.printToPDF` with custom print stylesheets (`@media print`), page-break avoidance, and crisp vector typography.
  - **Standalone HTML Guide**: Single self-contained HTML document with embedded base64 data URLs, table of contents, and responsive layout.
  - **Markdown Document**: Formatted GitHub-compatible `.md` document ready for Git repositories or wikis.
- **Local Persistence**: Flow guides saved locally in `guides.json` with zero server dependencies.

### 3. 🎨 Compose Studio (Feature 3)
- **Multi-Screenshot Presentation Storyboard**: Combine multiple screenshots into a cohesive, high-end visual composite.
- **Flexible Layout Engine**:
  - **Horizontal Row**: Ideal for before/after workflows and comparisons.
  - **Vertical Stack**: Perfect for sequential workflows, mobile flows, and tall forms.
  - **2-Column Grid**: Balanced showcase for UI dashboards and feature sets.
- **Precision Spacing & Alignments**:
  - Configurable item gap (0 to 64px) and outer canvas padding (0 to 96px).
  - Cross-axis alignment: Start, Center, End.
  - Optional vertical and horizontal dividers with custom color and stroke width.
  - Optional titles and captions for individual screenshots.
- **Window Frame Mockups**: Windows 11 titlebars (with min/max/close controls) or macOS 3-dot window headers.
- **Visual Styling**: Adjustable corner radius (0 to 24px) and soft elevation drop shadows (0 to 48px blur with Y offset).
- **Backdrop Styling**: Restrained solid charcoal/dark tones, transparent background, or vibrant multi-stop linear gradients.
- **Reusable Preset Management**: Save custom storyboard configurations as presets and switch instantly.
- **Lossless High-Resolution Export**: Renders at 100% natural pixel resolution for copy to clipboard or disk export (PNG, JPEG, WebP).

---

## 🛠️ Core Capture & Editor Capabilities

- **Instant Region Capture**: Global hotkey (`Ctrl + Shift + S`) across any active display or dual-monitor setup.
- **Multi-Monitor Display Switcher**: Per-display bounds handling with a top switcher pill (`Display 1` | `Display 2`) preventing DWM scaling distortion across mixed DPI monitors.
- **Non-Negotiable Fast Actions**:
  - **Enter** (Quick Copy): Copies captured region immediately to the Windows clipboard as true image data and closes the overlay.
  - **E** (Open Editor): Opens the full-screen annotation workspace with the image ready to edit.
  - **S** (Save): Writes screenshot directly to disk (`Pictures/Screenshots` by default).
  - **P** (Pin Screenshot): Opens an always-on-top, movable, floating window with adjustable opacity.
  - **Escape** (Cancel): Instantly dismisses capture mode without clutter.
- **Comprehensive Annotation Tools (15 Tools)**:
  - Arrow, Line, Rectangle, Rounded Rectangle, Ellipse.
  - Freehand Pen, Highlighter (multiply blend).
  - Text Annotations, Auto-incrementing Step Badges.
  - **Permanent Redaction**: Destruction of pixel data under blackout or blur zones before export.
  - Spotlight / Focus Highlight, Crop, Rotation (90° increments).
  - Color Picker Loupe with one-click HEX, RGB, and HSL copying.
- **Local WebAssembly OCR**:
  - Tesseract.js engine running completely offline on your device.
  - Extracts text from screenshots with one-click copy to clipboard.
- **Custom Shortcut Recorder**:
  - Record any valid accelerator combination (e.g., `Ctrl+Alt+S`, `F9`) with conflict detection and live registration.

---

## 🚀 Development & Packaging

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v24.18 x64)
- **Operating System**: Windows 10 / Windows 11

### 2. Run Automated Unit & Regression Tests
```bash
npm test
```
All 8 test suites pass with 100% success:
- `coordinates.test.ts`
- `diff.test.ts`
- `guides.test.ts`
- `compose.test.ts`
- `export.test.ts`
- `redaction.test.ts`
- `shortcuts.test.ts`
- `regression.test.ts`

### 3. Build Production Application
```bash
npm run build
```

### 4. Package Windows Application
```bash
npm run pack
```
Packaged output location:
`release/win-unpacked/SNAPSHOT.exe`

### 5. Generate Windows NSIS Installer
```bash
npm run dist
```
Installer output location:
`release/SNAPSHOT Setup 1.0.0.exe`

---

## 🔒 Privacy & Architecture

- **100% Offline & Private**: Zero telemetry, no cloud APIs, no mandatory accounts, no remote subscriptions.
- **Destructive Redaction**: Redacted areas are permanently overwritten at the pixel level before file encoding to prevent data leaks.
- **Atomic Local Persistence**: Settings, screenshot history, guides, and composition presets utilize atomic temporary-file swaps (`.tmp` to final) preventing corruption during sudden restarts.
- **Hardware Acceleration**: Built with lightweight Vite 8 + React 19 + TypeScript on Electron 44, designed to run smoothly on standard laptops with 16 GB RAM.
=======
# Snapshot

**Turn ordinary app screenshots into beautiful app-store visuals.**

Snapshot is a screenshot design tool for developers and creators who want to present their apps with polished layouts, smartphone mockups, and beautiful backgrounds.

Instead of settling for plain screenshots, create promotional visuals that showcase your app's interface.

## Features

- Upload your own app screenshots.
- Place screenshots inside smartphone mockups.
- Explore templates and background styles.
- Customize layouts and visual compositions.
- Create promotional graphics for app listings.
- Export finished designs, where supported by the current implementation.

## Preview

Coming soon — screenshots and a demo video.

## Try Snapshot

**Live demo:** https://snapshot.netlify.app/

The demo will be available once the website is deployed.

## Getting Started

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/snapshot.git
cd snapshot
```

Install dependencies using the package manager supported by the project.

For a typical npm-based project:

```bash
npm install
npm run dev
```

Check `package.json` for the exact scripts and requirements.

## Tech Stack

See the project source and `package.json` for the current frameworks, libraries, and tools.

## Contributing

Bug reports, ideas, and contributions are welcome. Please open an issue to discuss substantial changes before submitting a pull request.

## License

The license has not yet been specified. Please check the repository for licensing terms before reusing or redistributing the code.

---

Built with care for developers who want their apps to look their best.
>>>>>>> origin/main
