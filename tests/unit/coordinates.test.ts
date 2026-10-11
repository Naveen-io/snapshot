import { describe, it, expect } from 'vitest';

describe('Coordinate and Dimension Math', () => {
  it('correctly normalizes flipped or negative drag selection bounds', () => {
    const dragStart = { x: 300, y: 400 };
    const dragCurrent = { x: 100, y: 150 };

    const left = Math.min(dragStart.x, dragCurrent.x);
    const top = Math.min(dragStart.y, dragCurrent.y);
    const width = Math.abs(dragCurrent.x - dragStart.x);
    const height = Math.abs(dragCurrent.y - dragStart.y);

    expect(left).toBe(100);
    expect(top).toBe(150);
    expect(width).toBe(200);
    expect(height).toBe(250);
  });

  it('clamps coordinates safely within display bounds', () => {
    const screenWidth = 1920;
    const screenHeight = 1080;

    const requested = { x: -50, y: 1100, width: 300, height: 400 };

    const safeX = Math.max(0, Math.min(requested.x, screenWidth - 1));
    const safeY = Math.max(0, Math.min(requested.y, screenHeight - 1));
    const safeWidth = Math.max(1, Math.min(requested.width, screenWidth - safeX));
    const safeHeight = Math.max(1, Math.min(requested.height, screenHeight - safeY));

    expect(safeX).toBe(0);
    expect(safeY).toBe(1079);
    expect(safeWidth).toBe(300);
    expect(safeHeight).toBe(1);
  });

  it('calculates virtual bounding box across multi-monitor setup including negative coords', () => {
    const displays = [
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },      // Primary
      { bounds: { x: -1920, y: 0, width: 1920, height: 1080 } },  // Left monitor (negative x)
      { bounds: { x: 1920, y: -200, width: 2560, height: 1440 } } // Right monitor (taller, offset y)
    ];

    let minX = displays[0].bounds.x;
    let minY = displays[0].bounds.y;
    let maxX = displays[0].bounds.x + displays[0].bounds.width;
    let maxY = displays[0].bounds.y + displays[0].bounds.height;

    displays.forEach((d) => {
      minX = Math.min(minX, d.bounds.x);
      minY = Math.min(minY, d.bounds.y);
      maxX = Math.max(maxX, d.bounds.x + d.bounds.width);
      maxY = Math.max(maxY, d.bounds.y + d.bounds.height);
    });

    expect(minX).toBe(-1920);
    expect(minY).toBe(-200);
    expect(maxX).toBe(4480);
    expect(maxY).toBe(1240);
    expect(maxX - minX).toBe(6400);
    expect(maxY - minY).toBe(1440);
  });
});
