import { app, nativeImage, shell, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { ExportOptions } from '../shared/types';

export class ExportService {
  /**
   * Generates a timestamp-based filename according to pattern.
   */
  public generateFilename(pattern: string, format: 'png' | 'jpeg' | 'webp'): string {
    const now = new Date();
    const YYYY = String(now.getFullYear());
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    let name = pattern
      .replace(/{YYYY}/g, YYYY)
      .replace(/{MM}/g, MM)
      .replace(/{DD}/g, DD)
      .replace(/{HH}/g, HH)
      .replace(/{mm}/g, mm)
      .replace(/{ss}/g, ss);

    if (!name.endsWith(`.${format}`)) {
      name = `${name}.${format}`;
    }

    return name;
  }

  /**
   * Ensures the target directory exists and resolves unique filename to avoid accidental overwrites.
   */
  public getUniqueFilePath(dir: string, baseFilename: string): string {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let filePath = path.join(dir, baseFilename);
    if (!fs.existsSync(filePath)) {
      return filePath;
    }

    const parsed = path.parse(baseFilename);
    let counter = 1;
    while (fs.existsSync(filePath)) {
      filePath = path.join(dir, `${parsed.name}_${counter}${parsed.ext}`);
      counter++;
    }

    return filePath;
  }

  /**
   * Saves image data to disk in the specified format and location.
   */
  public async saveImage(
    dataUrl: string,
    options: {
      directory?: string;
      filenamePattern?: string;
      format?: 'png' | 'jpeg' | 'webp';
      quality?: number;
      targetPath?: string;
    }
  ): Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }> {
    try {
      const format = options.format || 'png';
      const image = nativeImage.createFromDataURL(dataUrl);

      if (image.isEmpty()) {
        return { success: false, error: 'Cannot save empty image' };
      }

      let buffer: Buffer;
      if (format === 'jpeg') {
        buffer = image.toJPEG(options.quality || 95);
      } else {
        // PNG preserves lossless alpha and crisp UI pixels
        buffer = image.toPNG();
      }

      let targetPath = options.targetPath;
      if (!targetPath) {
        const dir = options.directory || path.join(app.getPath('pictures'), 'Screenshots');
        const pattern = options.filenamePattern || 'Screenshot_{YYYY}-{MM}-{DD}_{HH}{mm}{ss}';
        const baseFilename = this.generateFilename(pattern, format);
        targetPath = this.getUniqueFilePath(dir, baseFilename);
      }

      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, buffer);

      return {
        success: true,
        filePath: targetPath,
        fileSize: buffer.length
      };
    } catch (err: any) {
      console.error('Failed to save screenshot image:', err);
      return { success: false, error: err?.message || 'File save failed' };
    }
  }

  /**
   * Opens the folder in Windows Explorer and highlights the file.
   */
  public showInFolder(filePath: string): void {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
    }
  }

  /**
   * Opens native directory selector dialog.
   */
  public async selectDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Screenshot Storage Folder'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  }

  /**
   * Saves text / markdown / HTML file with a native Save dialog.
   */
  public async saveTextFile(
    content: string,
    defaultName: string,
    filters: { name: string; extensions: string[] }[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Document',
        defaultPath: defaultName,
        filters
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Cancelled by user' };
      }

      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (err: any) {
      console.error('Failed to export text file:', err);
      return { success: false, error: err?.message || 'File export failed' };
    }
  }

  /**
   * Generates a vector-sharp, offline PDF document from styled HTML using an offscreen BrowserWindow.
   */
  public async exportHtmlToPdf(
    html: string,
    defaultName: string = 'guide.pdf'
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    let printWin: BrowserWindow | null = null;
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export PDF Guide',
        defaultPath: defaultName,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Cancelled by user' };
      }

      const targetPath = result.filePath;

      printWin = new BrowserWindow({
        show: false,
        width: 1200,
        height: 1600,
        webPreferences: {
          offscreen: true
        }
      });

      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await printWin.loadURL(dataUrl);

      // Wait a moment for any base64 images to decode in the DOM
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdfBuffer = await printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4
        }
      });

      fs.writeFileSync(targetPath, pdfBuffer);

      return { success: true, filePath: targetPath };
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      return { success: false, error: err?.message || 'PDF export failed' };
    } finally {
      if (printWin) {
        try {
          printWin.destroy();
        } catch {
          // Ignore
        }
      }
    }
  }

  /**
   * Saves screen recording video to disk.
   */
  public async saveVideo(
    buffer: Buffer,
    options?: { directory?: string; filenamePattern?: string }
  ): Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }> {
    try {
      const dir = options?.directory || path.join(app.getPath('videos'), 'Recordings');
      const pattern = options?.filenamePattern || 'Recording_{YYYY}-{MM}-{DD}_{HH}{mm}{ss}';
      const baseFilename = this.generateFilename(pattern, 'webp').replace(/\.webp$/, '.webm');
      const targetPath = this.getUniqueFilePath(dir, baseFilename);

      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, buffer);

      return {
        success: true,
        filePath: targetPath,
        fileSize: buffer.length
      };
    } catch (err: any) {
      console.error('Failed to save screen recording:', err);
      return { success: false, error: err?.message || 'Video save failed' };
    }
  }
}
