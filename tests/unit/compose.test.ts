import { describe, it, expect } from 'vitest';
import { calculateComposeLayout } from '../../src/shared/composeEngine';
import { ComposePreset } from '../../src/shared/types';
import { DEFAULT_COMPOSE_PRESETS } from '../../src/shared/constants';

describe('Compose Studio Layout Engine', () => {
  const baseConfig: ComposePreset = { ...DEFAULT_COMPOSE_PRESETS[0] };

  const sampleScreenshots = [
    { width: 800, height: 600 },
    { width: 800, height: 600 }
  ];

  it('calculates horizontal layout dimensions accurately', () => {
    const config: ComposePreset = {
      ...baseConfig,
      layout: 'horizontal',
      padding: 40,
      spacing: 20,
      frameType: 'none',
      showLabels: false
    };

    const result = calculateComposeLayout(sampleScreenshots, config);

    // Total width = 40 (left padding) + 800 + 20 (spacing) + 800 + 40 (right padding) = 1700
    expect(result.totalWidth).toBe(1700);
    // Total height = 40 + 600 + 40 = 680
    expect(result.totalHeight).toBe(680);
    expect(result.positions.length).toBe(2);
    expect(result.positions[0].x).toBe(40);
    expect(result.positions[1].x).toBe(860);
  });

  it('calculates vertical layout dimensions accurately', () => {
    const config: ComposePreset = {
      ...baseConfig,
      layout: 'vertical',
      padding: 30,
      spacing: 15,
      frameType: 'none',
      showLabels: false
    };

    const result = calculateComposeLayout(sampleScreenshots, config);

    // Total width = 30 + 800 + 30 = 860
    expect(result.totalWidth).toBe(860);
    // Total height = 30 + 600 + 15 + 600 + 30 = 1275
    expect(result.totalHeight).toBe(1275);
    expect(result.positions[0].y).toBe(30);
    expect(result.positions[1].y).toBe(645);
  });

  it('handles frame header height offset in layout computation', () => {
    const config: ComposePreset = {
      ...baseConfig,
      layout: 'horizontal',
      padding: 20,
      spacing: 10,
      frameType: 'windows',
      showLabels: true
    };

    const result = calculateComposeLayout(sampleScreenshots, config, 32, 28);
    // Extra per item = 28 (frame) + 32 (label) = 60
    // Total height = 20 + 600 + 60 + 20 = 700
    expect(result.totalHeight).toBe(700);
  });

  it('handles empty items without errors', () => {
    const result = calculateComposeLayout([], { ...baseConfig, padding: 35 });
    expect(result.totalWidth).toBe(70);
    expect(result.totalHeight).toBe(70);
    expect(result.positions).toEqual([]);
  });
});
