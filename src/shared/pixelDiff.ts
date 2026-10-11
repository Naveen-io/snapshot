export interface DiffRegion {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface DiffResult {
  diffPercentage: number;
  changedPixels: number;
  totalPixels: number;
  diffImageData: ImageData;
  regions: DiffRegion[];
  width: number;
  height: number;
}

export interface DiffOptions {
  /**
   * Color distance threshold from 0.0 (exact match) to 1.0 (completely different).
   * Default: 0.1 (10% color difference).
   */
  threshold?: number;
  /**
   * Highlight color for changed pixels: 'red' | 'magenta' | 'cyan' | 'yellow'.
   * Default: 'red'.
   */
  highlightColor?: 'red' | 'magenta' | 'cyan' | 'yellow';
  /**
   * Opacity of unchanged pixels in the heatmap (0.0 for transparent, 0.2 for dim).
   * Default: 0.15.
   */
  unchangedOpacity?: number;
}

/**
 * Computes color distance between two RGBA pixels.
 * Returns value between 0.0 and 1.0.
 */
export function getPixelColorDistance(
  r1: number,
  g1: number,
  b1: number,
  a1: number,
  r2: number,
  g2: number,
  b2: number,
  a2: number
): number {
  // If alpha difference is significant
  const alphaDiff = Math.abs(a1 - a2) / 255;
  if (alphaDiff > 0.15) {
    return alphaDiff;
  }

  // If both are transparent, they are identical
  if (a1 < 10 && a2 < 10) {
    return 0;
  }

  // Normalized Euclidean distance in RGB space
  const dr = (r1 - r2) / 255;
  const dg = (g1 - g2) / 255;
  const db = (b1 - b2) / 255;

  return Math.sqrt((dr * dr + dg * dg + db * db) / 3);
}

/**
 * Compares two ImageData objects of identical dimensions.
 * Generates difference heatmap and computes changed regions.
 */
export function compareImageData(
  imgDataA: ImageData,
  imgDataB: ImageData,
  options: DiffOptions = {}
): DiffResult {
  const width = imgDataA.width;
  const height = imgDataA.height;

  if (width !== imgDataB.width || height !== imgDataB.height) {
    throw new Error(
      `Cannot compare images with mismatched dimensions (${width}x${height} vs ${imgDataB.width}x${imgDataB.height}). Normalize dimensions first.`
    );
  }

  const threshold = options.threshold ?? 0.1;
  const unchangedAlpha = Math.round((options.unchangedOpacity ?? 0.15) * 255);

  let highlightR = 239;
  let highlightG = 68;
  let highlightB = 68;

  if (options.highlightColor === 'magenta') {
    highlightR = 217;
    highlightG = 70;
    highlightB = 239;
  } else if (options.highlightColor === 'cyan') {
    highlightR = 6;
    highlightG = 182;
    highlightB = 212;
  } else if (options.highlightColor === 'yellow') {
    highlightR = 234;
    highlightG = 179;
    highlightB = 8;
  }

  // Create output diff ImageData
  const dataA = imgDataA.data;
  const dataB = imgDataB.data;
  
  // Create buffer for output diff
  const outputData = new Uint8ClampedArray(dataA.length);

  let changedPixels = 0;
  const totalPixels = width * height;

  // Grid for clustering changed regions (grid cell size: 32x32)
  const cellSize = 32;
  const gridCols = Math.ceil(width / cellSize);
  const gridRows = Math.ceil(height / cellSize);
  const activeCells = new Uint8Array(gridCols * gridRows);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const r1 = dataA[idx];
      const g1 = dataA[idx + 1];
      const b1 = dataA[idx + 2];
      const a1 = dataA[idx + 3];

      const r2 = dataB[idx];
      const g2 = dataB[idx + 1];
      const b2 = dataB[idx + 2];
      const a2 = dataB[idx + 3];

      const distance = getPixelColorDistance(r1, g1, b1, a1, r2, g2, b2, a2);

      if (distance > threshold) {
        changedPixels++;

        // Paint changed pixel in highlight color
        outputData[idx] = highlightR;
        outputData[idx + 1] = highlightG;
        outputData[idx + 2] = highlightB;
        outputData[idx + 3] = 235;

        // Mark cell as active
        const cx = Math.floor(x / cellSize);
        const cy = Math.floor(y / cellSize);
        activeCells[cy * gridCols + cx] = 1;
      } else {
        // Paint unchanged pixel dimmed grayscale
        const gray = Math.round((r1 * 0.299 + g1 * 0.587 + b1 * 0.114) * 0.6);
        outputData[idx] = gray;
        outputData[idx + 1] = gray;
        outputData[idx + 2] = gray;
        outputData[idx + 3] = unchangedAlpha;
      }
    }
  }

  // Extract cluster bounding boxes from active cells
  const regions: DiffRegion[] = [];
  const visitedCells = new Uint8Array(activeCells.length);

  for (let cy = 0; cy < gridRows; cy++) {
    for (let cx = 0; cx < gridCols; cx++) {
      const cellIdx = cy * gridCols + cx;
      if (activeCells[cellIdx] === 1 && visitedCells[cellIdx] === 0) {
        // Flood fill to find connected cluster of changed cells
        let minX = cx * cellSize;
        let minY = cy * cellSize;
        let maxX = Math.min(width, (cx + 1) * cellSize);
        let maxY = Math.min(height, (cy + 1) * cellSize);

        const queue: [number, number][] = [[cx, cy]];
        visitedCells[cellIdx] = 1;

        while (queue.length > 0) {
          const [currX, currY] = queue.pop()!;
          minX = Math.min(minX, currX * cellSize);
          minY = Math.min(minY, currY * cellSize);
          maxX = Math.max(maxX, Math.min(width, (currX + 1) * cellSize));
          maxY = Math.max(maxY, Math.min(height, (currY + 1) * cellSize));

          // 4-neighbor check
          const neighbors = [
            [currX + 1, currY],
            [currX - 1, currY],
            [currX, currY + 1],
            [currX, currY - 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
              const nIdx = ny * gridCols + nx;
              if (activeCells[nIdx] === 1 && visitedCells[nIdx] === 0) {
                visitedCells[nIdx] = 1;
                queue.push([nx, ny]);
              }
            }
          }
        }

        regions.push({
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX,
          height: maxY - minY
        });
      }
    }
  }

  const diffPercentage = totalPixels > 0 ? (changedPixels / totalPixels) * 100 : 0;

  // Polyfill ImageData constructor for environments if needed
  let diffImgData: ImageData;
  if (typeof ImageData !== 'undefined') {
    diffImgData = new ImageData(outputData, width, height);
  } else {
    diffImgData = {
      data: outputData,
      width,
      height,
      colorSpace: 'srgb'
    } as any;
  }

  return {
    diffPercentage,
    changedPixels,
    totalPixels,
    diffImageData: diffImgData,
    regions,
    width,
    height
  };
}
