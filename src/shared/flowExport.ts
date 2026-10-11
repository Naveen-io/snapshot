import { Guide, GuideStep } from './types';

/**
 * Escapes HTML special characters to prevent XSS or rendering artifacts.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely reorders steps and recalculates 1-based sequential step numbers.
 */
export function reorderSteps(steps: GuideStep[], fromIndex: number, toIndex: number): GuideStep[] {
  if (fromIndex < 0 || fromIndex >= steps.length || toIndex < 0 || toIndex >= steps.length) {
    return steps;
  }
  const result = [...steps];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result.map((step, idx) => ({
    ...step,
    stepNumber: idx + 1
  }));
}

/**
 * Generates a clean, readable Markdown documentation file from a Guide.
 */
export function generateFlowMarkdown(guide: Guide): string {
  const lines: string[] = [];

  lines.push(`# ${guide.title || 'Step-by-Step Guide'}`);
  lines.push('');

  if (guide.description?.trim()) {
    lines.push(guide.description.trim());
    lines.push('');
  }

  lines.push(`*Generated with SNAPSHOT on ${new Date().toLocaleDateString()}*`);
  lines.push('');
  lines.push('---');
  lines.push('');

  if (!guide.steps || guide.steps.length === 0) {
    lines.push('*No steps added to this guide yet.*');
    return lines.join('\n');
  }

  guide.steps.forEach((step, idx) => {
    const num = step.stepNumber || idx + 1;
    const title = step.title?.trim() || `Step ${num}`;
    lines.push(`## Step ${num}: ${title}`);
    lines.push('');

    if (step.description?.trim()) {
      lines.push(step.description.trim());
      lines.push('');
    }

    if (step.imageDataUrl) {
      lines.push(`![Step ${num}: ${title}](${step.imageDataUrl})`);
      lines.push('');
    }

    if (step.caption?.trim()) {
      lines.push(`> *${step.caption.trim()}*`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Generates a self-contained, beautifully styled standalone HTML document
 * ready for browser viewing, offline distribution, and high-quality PDF printing.
 */
export function generateFlowHtml(guide: Guide): string {
  const guideTitle = escapeHtml(guide.title || 'Step-by-Step Guide');
  const guideDesc = guide.description ? escapeHtml(guide.description) : '';
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const stepsHtml = (guide.steps || []).map((step, idx) => {
    const num = step.stepNumber || idx + 1;
    const stepTitle = escapeHtml(step.title || `Step ${num}`);
    const stepDesc = step.description ? escapeHtml(step.description) : '';
    const badgeColor = step.badgeColor || '#06b6d4';
    const captionHtml = step.caption
      ? `<div class="step-caption">${escapeHtml(step.caption)}</div>`
      : '';

    return `
      <section class="step-card" id="step-${num}">
        <div class="step-header">
          <div class="step-badge" style="background-color: ${badgeColor};">${num}</div>
          <div class="step-title-wrap">
            <h2 class="step-title">${stepTitle}</h2>
          </div>
        </div>
        ${stepDesc ? `<div class="step-description">${stepDesc}</div>` : ''}
        ${
          step.imageDataUrl
            ? `
          <div class="step-image-container">
            <img src="${step.imageDataUrl}" alt="Step ${num}: ${stepTitle}" class="step-image" loading="lazy" />
            ${captionHtml}
          </div>
        `
            : ''
        }
      </section>
    `;
  }).join('\n');

  const tocHtml = (guide.steps || []).length > 1
    ? `
      <nav class="toc-container">
        <h3 class="toc-title">Table of Contents</h3>
        <ol class="toc-list">
          ${guide.steps
            .map((s, i) => {
              const num = s.stepNumber || i + 1;
              const title = escapeHtml(s.title || `Step ${num}`);
              return `<li><a href="#step-${num}"><span class="toc-num">${num}</span> ${title}</a></li>`;
            })
            .join('')}
        </ol>
      </nav>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${guideTitle}</title>
  <style>
    :root {
      --bg-page: #0f1117;
      --bg-card: #181b24;
      --bg-accent: #222736;
      --border-subtle: #2d3345;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --accent-color: #06b6d4;
      --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-page);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .container {
      width: 100%;
      max-width: 880px;
    }

    header.guide-header {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .guide-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 12px;
      color: var(--accent-color);
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    h1.guide-title {
      font-size: 30px;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.5px;
      margin-bottom: 12px;
      line-height: 1.25;
    }

    p.guide-description {
      font-size: 15px;
      color: var(--text-secondary);
      max-width: 720px;
      line-height: 1.6;
    }

    .toc-container {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 36px;
    }

    .toc-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 12px;
    }

    .toc-list {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 8px 16px;
    }

    .toc-list li a {
      color: var(--text-primary);
      text-decoration: none;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .toc-list li a:hover {
      background: var(--bg-accent);
      color: var(--accent-color);
    }

    .toc-num {
      background: var(--bg-accent);
      color: var(--accent-color);
      font-size: 11px;
      font-weight: 700;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .step-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 28px;
      margin-bottom: 32px;
      box-shadow: var(--shadow-card);
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 14px;
    }

    .step-badge {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 15px;
      color: #ffffff;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .step-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.3px;
    }

    .step-description {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 20px;
      white-space: pre-line;
      line-height: 1.6;
    }

    .step-image-container {
      background-color: #0b0c10;
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .step-image {
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: 8px 8px 0 0;
    }

    .step-caption {
      width: 100%;
      padding: 10px 16px;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid var(--border-subtle);
      background-color: rgba(0, 0, 0, 0.2);
      font-style: italic;
    }

    footer.guide-footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid var(--border-subtle);
      padding-top: 24px;
    }

    /* Print Stylesheet for Crisp Off-Screen PDF Export */
    @media print {
      body {
        background: #ffffff !important;
        color: #111827 !important;
        padding: 0 !important;
      }

      .container {
        max-width: 100% !important;
      }

      .toc-container {
        display: none !important;
      }

      .step-card {
        background: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        box-shadow: none !important;
        margin-bottom: 24px !important;
        padding: 20px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .step-title {
        color: #111827 !important;
      }

      .step-description {
        color: #374151 !important;
      }

      .step-image-container {
        background: #f9fafb !important;
        border: 1px solid #e5e7eb !important;
      }

      .step-caption {
        color: #6b7280 !important;
        background: #f9fafb !important;
      }

      h1.guide-title {
        color: #111827 !important;
      }

      p.guide-description {
        color: #4b5563 !important;
      }

      footer.guide-footer {
        color: #9ca3af !important;
        border-top-color: #e5e7eb !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="guide-header">
      <div class="guide-meta">
        <span>SNAPSHOT Flow Guide</span>
        <span>•</span>
        <span>${dateStr}</span>
        <span>•</span>
        <span>${(guide.steps || []).length} Steps</span>
      </div>
      <h1 class="guide-title">${guideTitle}</h1>
      ${guideDesc ? `<p class="guide-description">${guideDesc}</p>` : ''}
    </header>

    ${tocHtml}

    <main class="steps-wrapper">
      ${stepsHtml}
    </main>

    <footer class="guide-footer">
      Generated locally with SNAPSHOT Studio — Private, Fast, Offline Documentation
    </footer>
  </div>
</body>
</html>`;
}
