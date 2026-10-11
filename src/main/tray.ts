import { app, Tray, Menu, nativeImage } from 'electron';
import path from 'path';

export interface TrayCallbacks {
  onCapture: () => void;
  onOpenMain: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

export class SystemTrayService {
  private tray: Tray | null = null;
  private callbacks: TrayCallbacks;

  constructor(callbacks: TrayCallbacks) {
    this.callbacks = callbacks;
  }

  public init(): void {
    const iconPath = path.join(__dirname, '../../resources/tray.png');
    let icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
    // Resize cleanly for Windows taskbar tray (16x16 or 24x24)
    const trayIcon = icon.resize({ width: 16, height: 16 });

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('SNAPSHOT — Windows Screenshot Utility');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Take Screenshot (Ctrl+Shift+S)',
        click: () => this.callbacks.onCapture()
      },
      { type: 'separator' },
      {
        label: 'Open SNAPSHOT',
        click: () => this.callbacks.onOpenMain()
      },
      {
        label: 'Screenshot History',
        click: () => this.callbacks.onOpenHistory()
      },
      {
        label: 'Settings',
        click: () => this.callbacks.onOpenSettings()
      },
      { type: 'separator' },
      {
        label: 'Quit SNAPSHOT',
        click: () => this.callbacks.onQuit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);

    // Left click on tray opens main window or triggers capture
    this.tray.on('click', () => {
      this.callbacks.onOpenMain();
    });
  }

  public destroy(): void {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
