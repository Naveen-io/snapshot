import { describe, it, expect } from 'vitest';
import { reorderSteps, generateFlowMarkdown, generateFlowHtml, escapeHtml } from '../../src/shared/flowExport';
import { Guide, GuideStep } from '../../src/shared/types';

describe('Flow Guides Export and Step Ordering Engine', () => {
  const sampleSteps: GuideStep[] = [
    {
      id: 'step-1',
      stepNumber: 1,
      title: 'Open Settings Panel',
      description: 'Navigate to Windows Settings by pressing Win+I.',
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      caption: 'Main system settings window',
      badgeColor: '#06b6d4'
    },
    {
      id: 'step-2',
      stepNumber: 2,
      title: 'Select Display Tab',
      description: 'Click on System > Display to configure multi-monitor setup.',
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      caption: 'Display properties',
      badgeColor: '#3b82f6'
    },
    {
      id: 'step-3',
      stepNumber: 3,
      title: 'Set Refresh Rate to 144Hz',
      description: 'Under Advanced display, change the refresh rate to 144Hz.',
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      badgeColor: '#10b981'
    }
  ];

  const sampleGuide: Guide = {
    id: 'guide-123',
    title: 'How to Configure 144Hz Display in Windows 11',
    description: 'A comprehensive visual walkthrough to ensure high refresh rates are activated.',
    createdAt: '2026-10-10T12:00:00Z',
    updatedAt: '2026-10-10T12:00:00Z',
    steps: sampleSteps
  };

  it('reorders steps correctly and maintains 1-based sequential step numbers', () => {
    // Move Step 1 to position 2 (after Step 2)
    const reordered = reorderSteps(sampleSteps, 0, 1);
    expect(reordered[0].id).toBe('step-2');
    expect(reordered[0].stepNumber).toBe(1);

    expect(reordered[1].id).toBe('step-1');
    expect(reordered[1].stepNumber).toBe(2);

    expect(reordered[2].id).toBe('step-3');
    expect(reordered[2].stepNumber).toBe(3);

    // Invalid index handles gracefully
    const unchanged = reorderSteps(sampleSteps, -1, 5);
    expect(unchanged).toEqual(sampleSteps);
  });

  it('escapes special characters to prevent HTML/XSS injection', () => {
    const raw = '<script>alert("test & demo")</script>';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;test &amp; demo&quot;)&lt;/script&gt;');
  });

  it('generates well-structured Markdown document', () => {
    const md = generateFlowMarkdown(sampleGuide);

    expect(md).toContain('# How to Configure 144Hz Display in Windows 11');
    expect(md).toContain('A comprehensive visual walkthrough');
    expect(md).toContain('## Step 1: Open Settings Panel');
    expect(md).toContain('Navigate to Windows Settings by pressing Win+I.');
    expect(md).toContain('![Step 1: Open Settings Panel]');
    expect(md).toContain('> *Main system settings window*');
    expect(md).toContain('## Step 2: Select Display Tab');
    expect(md).toContain('## Step 3: Set Refresh Rate to 144Hz');
  });

  it('handles empty steps gracefully in Markdown generation', () => {
    const emptyGuide: Guide = {
      id: 'empty',
      title: 'Blank Guide',
      createdAt: '2026-10-10T12:00:00Z',
      updatedAt: '2026-10-10T12:00:00Z',
      steps: []
    };
    const md = generateFlowMarkdown(emptyGuide);
    expect(md).toContain('# Blank Guide');
    expect(md).toContain('*No steps added to this guide yet.*');
  });

  it('generates self-contained standalone HTML with responsive and print styles', () => {
    const html = generateFlowHtml(sampleGuide);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>How to Configure 144Hz Display in Windows 11</title>');
    expect(html).toContain('<h1 class="guide-title">How to Configure 144Hz Display in Windows 11</h1>');
    expect(html).toContain('Table of Contents');
    expect(html).toContain('class="step-badge" style="background-color: #06b6d4;"');
    expect(html).toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    expect(html).toContain('@media print');
    expect(html).toContain('page-break-inside: avoid');
  });
});
