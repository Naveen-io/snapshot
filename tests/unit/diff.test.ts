import { describe, it, expect } from 'vitest';
import { compareImageData, getPixelColorDistance } from '../../src/shared/pixelDiff';

function createMockImageData(
  width: number,
  height: number,
  fillColor: [number, number, number, number] = [255, 255, 255, 255]
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillColor[0];
    data[i + 1] = fillColor[1];
    data[i + 2] = fillColor[2];
    data[i + 3] = fillColor[3];
  }
  return {
    data,
    width,
    height,
    colorSpace: 'srgb'
  } as ImageData;
}

describe('Pixel Difference Engine', () => {
  it('correctly reports 0% difference for identical images', () => {
    const imgA = createMockImageData(100, 100, [50, 100, 150, 255]);
    const imgB = createMockImageData(100, 100, [50, 100, 150, 255]);

    const result = compareImageData(imgA, imgB, { threshold: 0.05 });

    expect(result.changedPixels).toBe(0);
    expect(result.diffPercentage).toBe(0);
    expect(result.regions.length).toBe(0);
  });

  it('correctly reports ~100% difference for completely inverted images', () => {
    const imgA = createMockImageData(50, 50, [0, 0, 0, 255]);
    const imgB = createMockImageData(50, 50, [255, 255, 255, 255]);

    const result = compareImageData(imgA, imgB, { threshold: 0.1 });

    expect(result.changedPixels).toBe(2500);
    expect(result.diffPercentage).toBe(100);
    expect(result.regions.length).toBeGreaterThan(0);
  });

  it('accurately identifies and bounds a small localized 10x10 change', () => {
    const width = 100;
    const height = 100;
    const imgA = createMockImageData(width, height, [200, 200, 200, 255]);
    const imgB = createMockImageData(width, height, [200, 200, 200, 255]);

    // Modify a 10x10 square in imgB from (20, 20) to (29, 29)
    for (let y = 20; y < 30; y++) {
      for (let x = 20; x < 30; x++) {
        const idx = (y * width + x) * 4;
        imgB.data[idx] = 0;
        imgB.data[idx + 1] = 0;
        imgB.data[idx + 2] = 0;
        imgB.data[idx + 3] = 255;
      }
    }

    const result = compareImageData(imgA, imgB, { threshold: 0.1 });

    expect(result.changedPixels).toBe(100); // 10x10 = 100 pixels
    expect(result.diffPercentage).toBe(1); // 100 / 10000 = 1%
    expect(result.regions.length).toBe(1);
    expect(result.regions[0].minX).toBeLessThanOrEqual(20);
    expect(result.regions[0].maxX).toBeGreaterThanOrEqual(30);
    expect(result.regions[0].minY).toBeLessThanOrEqual(20);
    expect(result.regions[0].maxY).toBeGreaterThanOrEqual(30);
  });

  it('respects color distance threshold sensitivity', () => {
    // Subtle difference: 200 vs 210 in RGB (delta ~0.039)
    const dist = getPixelColorDistance(200, 200, 200, 255, 210, 210, 210, 255);
    expect(dist).toBeGreaterThan(0.02);
    expect(dist).toBeLessThan(0.06);

    const imgA = createMockImageData(20, 20, [200, 200, 200, 255]);
    const imgB = createMockImageData(20, 20, [210, 210, 210, 255]);

    // High threshold (0.1) -> ignores subtle change
    const resHigh = compareImageData(imgA, imgB, { threshold: 0.1 });
    expect(resHigh.changedPixels).toBe(0);

    // Low threshold (0.02) -> detects change
    const resLow = compareImageData(imgA, imgB, { threshold: 0.02 });
    expect(resLow.changedPixels).toBe(400);
  });

  it('rejects comparing mismatched dimensions directly and requests normalization', () => {
    const imgA = createMockImageData(50, 50);
    const imgB = createMockImageData(60, 60);

    expect(() => compareImageData(imgA, imgB)).toThrow('mismatched dimensions');
  });
});
