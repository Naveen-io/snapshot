import { app, BrowserWindow, session, desktopCapturer } from 'electron';
import { StorageService } from './storage';
import { CaptureEngine } from './capture';
import { ClipboardService } from './clipboard';
import { ExportService } from './export';
import { ShortcutService } from './shortcuts';
import { WindowManager } from './windows';
import { SystemTrayService } from './tray';
import { setupIpcHandlers } from './ipc';
import { IPC_CHANNELS } from '../shared/constants';

// Single instance enforcement
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let storageService: StorageService;
let captureEngine: CaptureEngine;
let clipboardService: ClipboardService;
let exportService: ExportService;
let windowManager: WindowManager;
let shortcutService: ShortcutService;
let trayService: SystemTrayService;

/**
 * Triggers the frozen-screen desktop capture and activates the selection overlay.
 */
async function triggerCaptureWorkflow(): Promise<void> {
  try {
    const settings = storageService.getSettings();

    // Delayed capture support if configured
    if (settings.capture.delaySeconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, settings.capture.delaySeconds * 1000));
    }

    // Capture visual state of all screens before showing overlay (frozen frame)
    const captureResult = await captureEngine.captureAllScreens();
    const activeScreen =
      captureResult.screens.find((s) => s.displayId === captureResult.activeDisplayId) || captureResult.screens[0];

    if (!activeScreen) {
      console.warn('No active screen found for capture');
      return;
    }

    await windowManager.showOverlayWithData(activeScreen.bounds, {
      activeDisplayId: activeScreen.displayId,
      screens: captureResult.screens,
      settings: settings.capture
    });
  } catch (err) {
    console.error('Failed to trigger capture overlay:', err);
  }
}

app.on('second-instance', () => {
  const main = windowManager?.getMainWindow();
  if (main) {
    if (main.isMinimized()) main.restore();
    main.show();
    main.focus();
  }
});

app.whenReady().then(async () => {
  // Allow getDisplayMedia to record screen seamlessly
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback({ video: sources[0] });
    });
  });

  storageService = new StorageService();
  captureEngine = new CaptureEngine();
  clipboardService = new ClipboardService();
  exportService = new ExportService();
  windowManager = new WindowManager(storageService);
  windowManager.prewarmOverlayWindow();

  const settings = storageService.getSettings();

  // Initialize Global Hotkey
  shortcutService = new ShortcutService(() => {
    triggerCaptureWorkflow();
  });

  const regResult = shortcutService.register(settings.capture.hotkey);
  if (regResult.conflict) {
    console.warn('Hotkey conflict detected upon startup:', regResult.error);
  }

  // Setup IPC Handlers
  setupIpcHandlers(
    storageService,
    captureEngine,
    clipboardService,
    exportService,
    shortcutService,
    windowManager,
    triggerCaptureWorkflow
  );

  // Initialize Windows System Tray
  trayService = new SystemTrayService({
    onCapture: () => triggerCaptureWorkflow(),
    onOpenMain: () => {
      const win = windowManager.createMainWindow();
      win.show();
      win.focus();
    },
    onOpenHistory: () => {
      const win = windowManager.createMainWindow();
      win.show();
      win.focus();
      win.webContents.send('navigation:go-to', 'history');
    },
    onOpenSettings: () => {
      const win = windowManager.createMainWindow();
      win.show();
      win.focus();
      win.webContents.send('navigation:go-to', 'settings');
    },
    onQuit: () => {
      windowManager.setQuitting(true);
      app.quit();
    }
  });
  trayService.init();

  // Create main window according to startup settings
  windowManager.createMainWindow();

  // Configure Windows auto-start preference
  try {
    app.setLoginItemSettings({
      openAtLogin: settings.general.startWithWindows
    });
  } catch {
    // Ignore on development environments
  }
});

app.on('will-quit', () => {
  shortcutService?.unregisterAll();
  trayService?.destroy();
});

app.on('window-all-closed', () => {
  // Stay running in system tray unless closeToTray is disabled
  const settings = storageService?.getSettings();
  if (!settings?.general.closeToTray) {
    app.quit();
  }
});
