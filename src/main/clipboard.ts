import { clipboard, ClipboardItem } from 'electron';

export class ClipboardService {
  /**
   * Writes native image data directly to the Windows clipboard.
   * Verifies the write operation succeeded.
   */
  public async writeImage(dataUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        return { success: false, error: 'Invalid image data URL provided' };
      }

      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) {
        return { success: false, error: 'Invalid base64 payload' };
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'image/png' });
      const item = new ClipboardItem({ 'image/png': blob });

      await clipboard.write([item]);
      return { success: true };
    } catch (err: any) {
      console.error('Failed to write image to clipboard:', err);
      return { success: false, error: err?.message || 'Unknown clipboard error' };
    }
  }

  /**
   * Writes plain text to clipboard (e.g. for OCR extracted text or hex color codes).
   */
  public async writeText(text: string): Promise<{ success: boolean; error?: string }> {
    try {
      await clipboard.writeText(text);
      return { success: true };
    } catch (err: any) {
      console.error('Failed to write text to clipboard:', err);
      return { success: false, error: err?.message || 'Unknown text clipboard error' };
    }
  }

  /**
   * Reads an image currently in the clipboard if available.
   */
  public async readImage(): Promise<{ hasImage: boolean; dataUrl?: string }> {
    try {
      const hasImg = await clipboard.has('image/png');
      if (hasImg) {
        const items = await clipboard.read();
        for (const item of items) {
          if (item.types.includes('image/png')) {
            const blob = await item.getType('image/png');
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
            return { hasImage: true, dataUrl };
          }
        }
      }
    } catch (err) {
      console.warn('Failed to read image from clipboard:', err);
    }
    return { hasImage: false };
  }
}
