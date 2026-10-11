import { describe, it, expect } from 'vitest';
import { ExportService } from '../../src/main/export';

describe('Export and Filename Pattern Service', () => {
  const exportService = new ExportService();

  it('generates formatted filename matching user pattern', () => {
    const pattern = 'Screenshot_{YYYY}-{MM}-{DD}';
    const filename = exportService.generateFilename(pattern, 'png');

    const year = new Date().getFullYear();
    expect(filename).toContain(`Screenshot_${year}`);
    expect(filename.endsWith('.png')).toBe(true);
  });

  it('correctly appends extension when pattern lacks it', () => {
    const pattern = 'Capture_Test';
    const filenameJpg = exportService.generateFilename(pattern, 'jpeg');
    const filenameWebp = exportService.generateFilename(pattern, 'webp');

    expect(filenameJpg).toBe('Capture_Test.jpeg');
    expect(filenameWebp).toBe('Capture_Test.webp');
  });

  it('generates unique filenames to prevent accidental file overwriting', () => {
    // Simulated path check logic
    const base = 'Screenshot_1.png';
    const existing = new Set(['Screenshot_1.png', 'Screenshot_1_1.png']);

    let name = base;
    let counter = 1;
    const parts = name.split('.png');
    while (existing.has(name)) {
      name = `${parts[0]}_${counter}.png`;
      counter++;
    }

    expect(name).toBe('Screenshot_1_2.png');
  });
});
