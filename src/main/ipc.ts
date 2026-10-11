import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { StorageService } from './storage';
import { CaptureEngine } from './capture';
import { ClipboardService } from './clipboard';
import { ExportService } from './export';
import { ShortcutService } from './shortcuts';
import { WindowManager } from './windows';
import { AppSettings, Guide, ComposePreset } from '../shared/types';

export function setupIpcHandlers(
  storageService: StorageService,
  captureEngine: CaptureEngine,
  clipboardService: ClipboardService,
  exportService: ExportService,
  shortcutService: ShortcutService,
  windowManager: WindowManager,
  triggerCaptureWorkflow: () => Promise<void>
): void {
  // Capture workflows
  ipcMain.handle(IPC_CHANNELS.CAPTURE_START, async () => {
    await triggerCaptureWorkflow();
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_CANCEL, () => {
    windowManager.closeOverlay();
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_GET_DISPLAYS, () => {
    return windowManager.getLatestCapturePayload();
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_SWITCH_DISPLAY, (_, bounds: { x: number; y: number; width: number; height: number }) => {
    windowManager.moveOverlayToDisplay(bounds);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_GET_SOURCES, async () => {
    const windows = await captureEngine.getAvailableWindows();
    return windows;
  });

  // Action: Quick Copy (Enter)
  ipcMain.handle(IPC_CHANNELS.QUICK_COPY, async (_, payload: { dataUrl: string; width: number; height: number }) => {
    try {
      const copyResult = await clipboardService.writeImage(payload.dataUrl);
      if (!copyResult.success) {
        return { success: false, error: copyResult.error };
      }

      // Add to local history
      const historyItem = await storageService.addHistoryItem({
        dataUrl: payload.dataUrl,
        width: payload.width,
        height: payload.height
      });

      // Check auto-save preference
      const settings = storageService.getSettings();
      if (settings.saving.autoSave) {
        await exportService.saveImage(payload.dataUrl, {
          directory: settings.saving.saveDirectory,
          filenamePattern: settings.saving.filenamePattern,
          format: settings.saving.defaultFormat,
          quality: settings.saving.quality
        });
      }

      // Close overlay immediately
      windowManager.closeOverlay();

      return { success: true, historyId: historyItem.id };
    } catch (err: any) {
      console.error('Quick copy error:', err);
      return { success: false, error: err?.message };
    }
  });

  // Action: Open Editor (E)
  ipcMain.handle(IPC_CHANNELS.OPEN_EDITOR, async (_, payload: { dataUrl: string; width: number; height: number }) => {
    try {
      windowManager.closeOverlay();
      windowManager.openEditorWithImage(payload.dataUrl);
      return { success: true };
    } catch (err: any) {
      console.error('Open editor error:', err);
      return { success: false, error: err?.message };
    }
  });

  // Action: Save Capture (S)
  ipcMain.handle(IPC_CHANNELS.SAVE_CAPTURE, async (_, payload: { dataUrl: string; width: number; height: number; format?: 'png' | 'jpeg' | 'webp' }) => {
    try {
      const settings = storageService.getSettings();
      const format = payload.format || settings.saving.defaultFormat;

      const saveRes = await exportService.saveImage(payload.dataUrl, {
        directory: settings.saving.saveDirectory,
        filenamePattern: settings.saving.filenamePattern,
        format,
        quality: settings.saving.quality
      });

      if (!saveRes.success) {
        return { success: false, error: saveRes.error };
      }

      await storageService.addHistoryItem({
        dataUrl: payload.dataUrl,
        width: payload.width,
        height: payload.height,
        filePath: saveRes.filePath,
        fileSize: saveRes.fileSize,
        format
      });

      windowManager.closeOverlay();

      return { success: true, filePath: saveRes.filePath };
    } catch (err: any) {
      console.error('Save capture error:', err);
      return { success: false, error: err?.message };
    }
  });

  // Action: Pin Capture (P)
  ipcMain.handle(IPC_CHANNELS.PIN_CAPTURE, async (_, payload: { dataUrl: string; width: number; height: number }) => {
    try {
      windowManager.closeOverlay();
      windowManager.createPinWindow(payload.dataUrl, payload.width, payload.height);

      await storageService.addHistoryItem({
        dataUrl: payload.dataUrl,
        width: payload.width,
        height: payload.height
      });

      return { success: true };
    } catch (err: any) {
      console.error('Pin capture error:', err);
      return { success: false, error: err?.message };
    }
  });

  // Clipboard operations
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_WRITE_IMAGE, async (_, dataUrl: string) => {
    return clipboardService.writeImage(dataUrl);
  });

  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_WRITE_TEXT, async (_, text: string) => {
    return clipboardService.writeText(text);
  });

  // File operations
  ipcMain.handle(IPC_CHANNELS.FILE_SAVE_IMAGE, async (_, options: { dataUrl: string; format?: 'png' | 'jpeg' | 'webp'; quality?: number; targetPath?: string }) => {
    const settings = storageService.getSettings();
    return exportService.saveImage(options.dataUrl, {
      directory: settings.saving.saveDirectory,
      filenamePattern: settings.saving.filenamePattern,
      format: options.format || settings.saving.defaultFormat,
      quality: options.quality || settings.saving.quality,
      targetPath: options.targetPath
    });
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SAVE_VIDEO, async (_, payload: { base64: string; duration?: number; width?: number; height?: number; filename?: string }) => {
    try {
      const buffer = Buffer.from(payload.base64, 'base64');
      const saveRes = await exportService.saveVideo(buffer);
      if (!saveRes.success || !saveRes.filePath) {
        return { success: false, error: saveRes.error };
      }

      // Add to local history as video item
      await storageService.addHistoryItem({
        dataUrl: '',
        width: payload.width || 1920,
        height: payload.height || 1080,
        filePath: saveRes.filePath,
        fileSize: saveRes.fileSize,
        format: 'webm',
        type: 'video',
        duration: payload.duration
      });

      return { success: true, filePath: saveRes.filePath, fileSize: saveRes.fileSize };
    } catch (err: any) {
      console.error('Failed to save screen recording:', err);
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SELECT_DIRECTORY, async () => {
    return exportService.selectDirectory();
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SHOW_IN_FOLDER, (_, filePath: string) => {
    exportService.showInFolder(filePath);
    return true;
  });

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return storageService.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, (_, newSettings: Partial<AppSettings>) => {
    const updated = storageService.saveSettings(newSettings);
    if (newSettings.capture?.hotkey) {
      shortcutService.register(newSettings.capture.hotkey);
    }
    return updated;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_REGISTER_HOTKEY, (_, hotkey: string) => {
    return shortcutService.register(hotkey);
  });

  // History
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, () => {
    return storageService.getHistory();
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, async (_, id: string) => {
    return storageService.deleteHistoryItem(id);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, async () => {
    return storageService.clearHistory();
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_UPDATE, (_, { id, updates }: { id: string; updates: any }) => {
    storageService.updateHistoryItem(id, updates);
    return true;
  });

  // Flow Guides
  ipcMain.handle(IPC_CHANNELS.GUIDES_GET_ALL, () => {
    return storageService.getGuides();
  });

  ipcMain.handle(IPC_CHANNELS.GUIDES_SAVE, (_, guide: Guide) => {
    return storageService.saveGuide(guide);
  });

  ipcMain.handle(IPC_CHANNELS.GUIDES_DELETE, (_, id: string) => {
    return storageService.deleteGuide(id);
  });

  ipcMain.handle(IPC_CHANNELS.FLOW_EXPORT_PDF, async (_, payload: { html: string; defaultName?: string }) => {
    return exportService.exportHtmlToPdf(payload.html, payload.defaultName || 'flow_guide.pdf');
  });

  ipcMain.handle(IPC_CHANNELS.FLOW_EXPORT_HTML, async (_, payload: { html: string; defaultName?: string }) => {
    return exportService.saveTextFile(
      payload.html,
      payload.defaultName || 'flow_guide.html',
      [{ name: 'HTML Document', extensions: ['html'] }]
    );
  });

  ipcMain.handle(IPC_CHANNELS.FLOW_EXPORT_MARKDOWN, async (_, payload: { markdown: string; defaultName?: string }) => {
    return exportService.saveTextFile(
      payload.markdown,
      payload.defaultName || 'flow_guide.md',
      [{ name: 'Markdown Document', extensions: ['md'] }]
    );
  });

  // Compose Presets
  ipcMain.handle(IPC_CHANNELS.COMPOSE_PRESETS_GET, () => {
    return storageService.getComposePresets();
  });

  ipcMain.handle(IPC_CHANNELS.COMPOSE_PRESETS_SAVE, (_, preset: ComposePreset) => {
    return storageService.saveComposePreset(preset);
  });

  ipcMain.handle(IPC_CHANNELS.COMPOSE_PRESETS_DELETE, (_, id: string) => {
    return storageService.deleteComposePreset(id);
  });

  // Window frame controls for custom titlebar
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_PIN_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_PIN_OPACITY, (event, opacity: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setOpacity(Math.max(0.2, Math.min(1.0, opacity)));
    }
  });
}
