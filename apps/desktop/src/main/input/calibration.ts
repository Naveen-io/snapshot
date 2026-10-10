import type { CalibrationCorner, CalibrationData } from '../../../../../packages/protocol/src/types.ts';

export class DisplayCalibrationManager {
  private _data: CalibrationData;

  constructor(displayId: string = 'primary') {
    // Default calibration covers full normalized area with comfortable inner margins
    this._data = {
      displayId,
      bounds: {
        xMin: 0.15,
        yMin: 0.15,
        xMax: 0.85,
        yMax: 0.85,
      },
      points: {
        top_left: { x: 0.15, y: 0.15 },
        top_right: { x: 0.85, y: 0.15 },
        bottom_left: { x: 0.15, y: 0.85 },
        bottom_right: { x: 0.85, y: 0.85 },
      },
    };
  }

  get calibrationData(): CalibrationData {
    return { ...this._data };
  }

  setPoint(corner: CalibrationCorner, x: number, y: number): void {
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));
    this._data.points[corner] = { x: clampedX, y: clampedY };

    // Recompute bounds
    const pts = Object.values(this._data.points);
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);

    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    // Ensure non-zero width/height
    this._data.bounds = {
      xMin: xMax - xMin > 0.05 ? xMin : Math.max(0, xMin - 0.1),
      xMax: xMax - xMin > 0.05 ? xMax : Math.min(1, xMax + 0.1),
      yMin: yMax - yMin > 0.05 ? yMin : Math.max(0, yMin - 0.1),
      yMax: yMax - yMin > 0.05 ? yMax : Math.min(1, yMax + 0.1),
    };
  }

  mapToScreenRatio(normX: number, normY: number): { x: number; y: number } {
    const { xMin, xMax, yMin, yMax } = this._data.bounds;
    const rangeX = xMax - xMin || 1.0;
    const rangeY = yMax - yMin || 1.0;

    const mappedX = (normX - xMin) / rangeX;
    const mappedY = (normY - yMin) / rangeY;

    return {
      x: Math.max(0, Math.min(1, mappedX)),
      y: Math.max(0, Math.min(1, mappedY)),
    };
  }

  loadData(data: CalibrationData): void {
    this._data = { ...data };
  }
}
