import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { StorageService } from './storage';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private pinWindows: Set<BrowserWindow> = new Set();
  private storageService: StorageService;
  private isQuitting: boolean = false;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  public setQuitting(quitting: boolean): void {
    this.isQuitting = quitting;
  }

  /**
   * Creates or restores the main application window (Editor, History, Settings).
   */
  public createMainWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const preloadPath = path.join(__dirname, '../preload/index.js');
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: 'SNAPSHOT',
      icon: path.join(__dirname, '../../resources/icon.ico'),
      backgroundColor: '#0f1117',
      show: false,
      frame: false, // Custom sleek Windows 11 titlebar
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      const settings = this.storageService.getSettings();
      if (!settings.general.startMinimized) {
        this.mainWindow?.show();
      }
    });

    this.mainWindow.on('close', (e) => {
      const settings = this.storageService.getSettings();
      if (!this.isQuitting && settings.general.closeToTray) {
        e.preventDefault();
        this.mainWindow?.hide();
      }
    });

    return this.mainWindow;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Opens main window and instructs it to load an image into the editor.
   */
  public openEditorWithImage(imageDataUrl: string): void {
    const main = this.createMainWindow();
    main.show();
    main.focus();
    main.webContents.send('event:image-loaded-for-editor', imageDataUrl);
  }

  private latestCapturePayload: any = null;

  public getLatestCapturePayload(): any {
    return this.latestCapturePayload;
  }

  /**
   * Pre-warms the capture overlay window on startup so that the first capture trigger
   * is immediate without waiting for HTML parsing or React mounting.
   */
  public prewarmOverlayWindow(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      const primary = screen.getPrimaryDisplay();
      this.createOverlayWindow(primary.bounds);
    }
  }

  /**
   * Creates or restores the capture overlay window covering target display bounds.
   */
  public createOverlayWindow(bounds: { x: number; y: number; width: number; height: number }): BrowserWindow {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.setBounds(bounds);
      return this.overlayWindow;
    }

    const preloadPath = path.join(__dirname, '../preload/index.js');
    this.overlayWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      hasShadow: false,
      fullscreenable: false,
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    // Make sure overlay stays on top of taskbars and fullscreen apps
    this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      this.overlayWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/overlay.html`);
    } else {
      this.overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
    }

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
    });

    return this.overlayWindow;
  }

  /**
   * Guarantees delivery of capture data before exposing the overlay window to prevent grey/blue screens.
   */
  public async showOverlayWithData(
    bounds: { x: number; y: number; width: number; height: number },
    payload: any
  ): Promise<void> {
    this.latestCapturePayload = payload;
    const overlay = this.createOverlayWindow(bounds);
    overlay.setBounds(bounds);

    // If the window is still loading its HTML/JS, wait until did-finish-load before sending payload and showing
    if (overlay.webContents.isLoading()) {
      await new Promise<void>((resolve) => {
        overlay.webContents.once('did-finish-load', () => {
          resolve();
        });
      });
    }

    // Deliver frozen screen payload
    overlay.webContents.send('capture:displays', payload);

    // Reveal overlay now that capture data is ready
    overlay.show();
    overlay.focus();
  }

  public closeOverlay(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide();
      this.latestCapturePayload = null;
    }
  }

  public moveOverlayToDisplay(bounds: { x: number; y: number; width: number; height: number }): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.setBounds(bounds);
    }
  }

  /**
   * Creates a pinned floating screenshot window.
   */
  public createPinWindow(imageDataUrl: string, width: number, height: number): BrowserWindow {
    const preloadPath = path.join(__dirname, '../preload/index.js');

    // Clamp initial dimensions reasonably
    const initialWidth = Math.min(Math.max(width, 240), 960);
    const initialHeight = Math.min(Math.max(height, 160), 640);

    const pinWin = new BrowserWindow({
      width: Math.round(initialWidth),
      height: Math.round(initialHeight),
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      hasShadow: true,
      skipTaskbar: false,
      resizable: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    pinWin.setAlwaysOnTop(true, 'floating');

    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      pinWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}/pin.html`);
    } else {
      pinWin.loadFile(path.join(__dirname, '../renderer/pin.html'));
    }

    pinWin.once('ready-to-show', () => {
      pinWin.webContents.send('event:pin-image-loaded', {
        dataUrl: imageDataUrl,
        width,
        height
      });
      pinWin.show();
    });

    pinWin.on('closed', () => {
      this.pinWindows.delete(pinWin);
    });

    this.pinWindows.add(pinWin);
    return pinWin;
  }
}
