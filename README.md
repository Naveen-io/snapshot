# SNAPSHOT

### A Free, Open-Source Screenshot Workspace for Windows

**Capture instantly. Annotate beautifully. Compare visually. Document effortlessly.**

SNAPSHOT is a free, open-source screenshot application for Windows 10 and Windows 11, built for developers, designers, students, and anyone who needs more from their screenshots.

Capture any region of your screen, extract text with built-in offline OCR, annotate with professional tools, create polished gradient compositions, compare screenshots, and turn screen captures into step-by-step documentation — all from one lightweight desktop workspace.

No account required. No cloud uploads. No subscriptions.

## Features

### Capture Your Screen Instantly

- **Quick region capture** with a global keyboard shortcut.
- **Multi-monitor support** for capturing content across multiple displays.
- **Fast actions** to copy, save, edit, pin, or cancel a capture.
- **Custom keyboard shortcuts** with conflict detection.
- **Floating screenshot pins** to keep reference images visible while you work.

### A Powerful Screenshot Editor

Go beyond basic screenshots with a comprehensive annotation workspace.

- **Drawing tools:** Arrows, lines, rectangles, rounded rectangles, ellipses, freehand pen, and highlighter.
- **Text annotations:** Add explanations, labels, and notes directly to screenshots.
- **Step badges:** Number steps to create clear visual instructions.
- **Professional styling:** Use colors, gradients, and clean visual compositions to make screenshots easier to understand.
- **Spotlight and focus:** Highlight important interface elements.
- **Crop and rotate:** Refine screenshots before exporting.
- **Color picker loupe:** Inspect colors and copy HEX, RGB, and HSL values.

### Built-In OCR — Completely Offline

Extract text from screenshots without manually typing it out.

- Recognize text using Tesseract.js.
- Copy extracted text to your clipboard.
- Process screenshots locally on your device.
- No cloud OCR service or API key required.

### Permanent Redaction

Protect sensitive information before sharing screenshots.

- Cover private information with redaction tools.
- Permanently apply redaction to image pixels before export.
- Keep sensitive information out of the resulting image when redaction is correctly applied.

**Important:** Permanent redaction is different from ordinary blur or an editable overlay. Always verify the exported image before sharing sensitive screenshots.

### Visual Diff Studio

Compare two screenshots to understand what changed between interface states.

- **Split comparison:** Drag a divider to inspect before-and-after screenshots.
- **Side-by-side:** View both images together.
- **Opacity overlay:** Blend two screenshots.
- **Difference heatmap:** Highlight pixel-level visual differences.
- **Changed-region detection:** Identify areas that may have changed.
- **Adjustable sensitivity:** Tune comparison thresholds and highlight colors.
- **Flexible alignment:** Normalize screenshots with different dimensions.
- **Export:** Save or copy comparison results.

Useful for UI regression checks, design reviews, debugging, and tracking interface changes.

### Screenshot Flow Guides

Turn screenshots into step-by-step visual documentation.

- Capture steps directly or import existing screenshots.
- Add step titles, instructions, and captions.
- Reorder steps and automatically renumber them.
- Customize step badge colors.
- Export guides as **PDF, standalone HTML, or Markdown**.
- Keep documentation stored locally.

Create tutorials, setup instructions, troubleshooting guides, and reproducible workflows without needing a separate documentation service.

### Compose Studio

Combine multiple screenshots into polished visual presentations.

- Horizontal layouts, vertical stacks, and two-column grids.
- Adjustable spacing, padding, alignment, and dividers.
- Optional titles and captions.
- Windows-style and macOS-style window frames.
- Custom corner radii and drop shadows.
- Solid, transparent, and gradient backgrounds.
- Reusable composition presets.
- Export images as PNG, JPEG, or WebP.

Whether you are preparing a project README, documenting a feature, showcasing an interface, or sharing a visual comparison, Compose Studio helps you bring multiple screenshots together in one image.

## Privacy First

SNAPSHOT is designed around local processing and user control.

- **Free and open-source:** No paid subscription required.
- **Offline OCR:** Text recognition runs locally.
- **No mandatory accounts:** Start using the application without creating an account.
- **No cloud dependency:** Your screenshots and documentation stay on your device during normal local workflows.
- **Local persistence:** Application data and settings are stored locally.
- **No telemetry:** The application is designed without telemetry.

## Download SNAPSHOT for Windows

**Get the latest Windows release:** [View SNAPSHOT Releases](https://github.com/Naveen-io/snapshot/releases)

1. Open the Releases page.
2. Download the latest Windows installer, if one is available.
3. Run the installer and follow the on-screen instructions.
4. Launch SNAPSHOT and use the configured capture shortcut to get started.

If no packaged release is available yet, you can build the application from source using the instructions below.

## Build From Source

### Requirements

- Windows 10 or Windows 11
- Node.js 20 or later
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/Naveen-io/snapshot.git
cd snapshot
```

Install dependencies:

```bash
npm install
```

Run the available test suite:

```bash
npm test
```

Build the application:

```bash
npm run build
```

Package the Windows application:

```bash
npm run pack
```

Generate the Windows installer:

```bash
npm run dist
```

Check `package.json` for the exact scripts and dependencies supported by your current checkout.

## Technology

SNAPSHOT is built with:

- Electron
- React
- TypeScript
- Vite
- Tesseract.js for local OCR

The application is designed for Windows desktop use, including multi-monitor workflows.

## Contributing

SNAPSHOT is open-source, and contributions, bug reports, feature suggestions, and improvements are welcome.

If you encounter a problem, please open an issue with the relevant details and steps to reproduce it. For substantial changes, discuss your proposal before submitting a pull request.

## License

See the repository's [LICENSE file](https://github.com/Naveen-io/snapshot) for the applicable license terms.

## About

SNAPSHOT brings screenshot capture, annotation, OCR, visual comparison, composition, and documentation together in one free Windows workspace.

**Capture instantly. Edit only when needed. Keep your workflow moving.**
