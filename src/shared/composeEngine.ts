import { ComposeItem, ComposePreset, ComposeLayout, ComposeAlignment } from './types';

export interface ItemLayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComposeLayoutResult {
  totalWidth: number;
  totalHeight: number;
  positions: ItemLayoutPosition[];
}

/**
 * Calculates the exact output dimensions and coordinates of each screenshot item
 * in a composite layout (horizontal row, vertical stack, or 2-column grid),
 * factoring in spacing, outer padding, optional headers/labels, and frame headers.
 */
export function calculateComposeLayout(
  items: { width: number; height: number }[],
  config: ComposePreset,
  labelHeight: number = 32,
  frameHeaderHeight: number = 28
): ComposeLayoutResult {
  if (!items || items.length === 0) {
    return {
      totalWidth: config.padding * 2,
      totalHeight: config.padding * 2,
      positions: []
    };
  }

  const padding = config.padding;
  const spacing = config.spacing;
  const layout = config.layout;
  const extraPerItemHeight =
    (config.frameType !== 'none' ? frameHeaderHeight : 0) +
    (config.showLabels ? labelHeight : 0);

  const effectiveItems = items.map((it) => ({
    width: it.width,
    height: it.height + extraPerItemHeight
  }));

  const positions: ItemLayoutPosition[] = [];

  if (layout === 'horizontal') {
    const maxHeight = Math.max(...effectiveItems.map((it) => it.height));
    let currentX = padding;

    for (let i = 0; i < effectiveItems.length; i++) {
      const it = effectiveItems[i];
      let y = padding;
      if (config.alignment === 'center') {
        y = padding + (maxHeight - it.height) / 2;
      } else if (config.alignment === 'end') {
        y = padding + (maxHeight - it.height);
      }

      positions.push({
        x: Math.round(currentX),
        y: Math.round(y),
        width: items[i].width,
        height: items[i].height
      });

      currentX += it.width + spacing;
    }

    const totalWidth = Math.round(currentX - spacing + padding);
    const totalHeight = Math.round(maxHeight + padding * 2);

    return { totalWidth, totalHeight, positions };
  } else if (layout === 'vertical') {
    const maxWidth = Math.max(...effectiveItems.map((it) => it.width));
    let currentY = padding;

    for (let i = 0; i < effectiveItems.length; i++) {
      const it = effectiveItems[i];
      let x = padding;
      if (config.alignment === 'center') {
        x = padding + (maxWidth - it.width) / 2;
      } else if (config.alignment === 'end') {
        x = padding + (maxWidth - it.width);
      }

      positions.push({
        x: Math.round(x),
        y: Math.round(currentY),
        width: items[i].width,
        height: items[i].height
      });

      currentY += it.height + spacing;
    }

    const totalWidth = Math.round(maxWidth + padding * 2);
    const totalHeight = Math.round(currentY - spacing + padding);

    return { totalWidth, totalHeight, positions };
  } else {
    // Grid mode: 2 items per row
    const cols = 2;
    const colWidths = [0, 0];
    const rowHeights: number[] = [];

    // Calculate column widths and row heights
    for (let i = 0; i < effectiveItems.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      colWidths[col] = Math.max(colWidths[col], effectiveItems[i].width);
      if (rowHeights[row] === undefined) {
        rowHeights[row] = effectiveItems[i].height;
      } else {
        rowHeights[row] = Math.max(rowHeights[row], effectiveItems[i].height);
      }
    }

    const totalWidth =
      padding * 2 +
      colWidths.reduce((a, b) => a + b, 0) +
      (colWidths.length - 1) * spacing;
    const totalHeight =
      padding * 2 +
      rowHeights.reduce((a, b) => a + b, 0) +
      (rowHeights.length - 1) * spacing;

    for (let i = 0; i < effectiveItems.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      let x = padding;
      for (let c = 0; c < col; c++) {
        x += colWidths[c] + spacing;
      }

      let y = padding;
      for (let r = 0; r < row; r++) {
        y += rowHeights[r] + spacing;
      }

      positions.push({
        x: Math.round(x),
        y: Math.round(y),
        width: items[i].width,
        height: items[i].height
      });
    }

    return { totalWidth, totalHeight, positions };
  }
}
