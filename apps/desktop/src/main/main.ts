import { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import crypto from 'crypto';
import WebSocket from 'ws';

import { OrbitStateMachine } from './state_machine.ts';
import { DisplayCalibrationManager } from './input/calibration.ts';
import { WindowsInputAdapter, Win32InputSink } from './input/windows_input.ts';
import type { DisplayTarget, OrbitConfig, OrbitMode } from '../../../../packages/protocol/src/types.ts';
import { DEFAULT_ORBIT_CONFIG } from '../../../../packages/protocol/src/types.ts';

// App root path resolution
const projectRoot = path.resolve(__dirname, '../../../../');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pythonProcess: ChildProcess | null = null;
let wsClient: WebSocket | null = null;

const sessionToken = crypto.randomBytes(16).toString('hex');
const visionPort = 8765;

const stateMachine = new OrbitStateMachine('OFF');
const calibrationManager = new DisplayCalibrationManager('primary');
let orbitConfig: OrbitConfig = { ...DEFAULT_ORBIT_CONFIG };

// Win32 native input sink
const win32Sink = new Win32InputSink((cmd: string) => {
  // Execute small PowerShell / Win32 snippet asynchronously
  spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], {
    windowsHide: true,
    stdio: 'ignore',
  });
});

let currentTargetDisplay: DisplayTarget = {
  id: 'primary',
  name: 'DISPLAY1',
  width: 1536,
  height: 864,
  x: 0,
  y: 0,
  primary: true,
};

const inputAdapter = new WindowsInputAdapter(
  stateMachine,
  calibrationManager,
  currentTargetDisplay,
  win32Sink
);

function getDisplaysList(): DisplayTarget[] {
  const allDisplays = screen.getAllDisplays();
  return allDisplays.map((d, idx) => ({
    id: d.id.toString(),
    name: `DISPLAY${idx + 1}`,
    width: d.bounds.width,
    height: d.bounds.height,
    x: d.bounds.x,
    y: d.bounds.y,
    primary: d.bounds.x === 0 && d.bounds.y === 0,
  }));
}

function updateTargetDisplay(displayId: string): void {
  const displays = getDisplaysList();
  const matched = displays.find((d) => d.id === displayId) || displays[0];
  if (matched) {
    currentTargetDisplay = matched;
    inputAdapter.setTargetDisplay(matched);
  }
}

function spawnVisionService(): void {
  const pythonCmd = 'python';
  console.log('[ORBIT Supervisor] Spawning Python vision service...');

  pythonProcess = spawn(pythonCmd, ['-m', 'services.vision.server'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      ORBIT_PORT: visionPort.toString(),
      ORBIT_SESSION_TOKEN: sessionToken,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pythonProcess.stdout?.on('data', (data) => {
    console.log(`[Vision STDOUT] ${data.toString().trim()}`);
  });

  pythonProcess.stderr?.on('data', (data) => {
    console.warn(`[Vision STDERR] ${data.toString().trim()}`);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.warn(`[ORBIT Supervisor] Python vision service exited with code ${code}, signal ${signal}`);
    pythonProcess = null;
    stateMachine.requestMode('ERROR');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('orbit:status-update', {
        version: 1,
        type: 'status',
        camera: 'error',
        mode: 'ERROR',
        fps: 0,
        handDetected: false,
        message: 'Vision service process terminated unexpectedly',
        timestamp: Date.now(),
      });
    }
  });

  // Connect WebSocket after slight delay for server startup
  setTimeout(connectVisionWebSocket, 1200);
}

function killVisionService(): void {
  if (pythonProcess && pythonProcess.pid) {
    console.log('[ORBIT Supervisor] Terminating Python vision service...');
    try {
      // Clean kill on Windows
      spawn('taskkill', ['/pid', pythonProcess.pid.toString(), '/f', '/t'], { windowsHide: true });
    } catch {
      pythonProcess.kill('SIGTERM');
    }
    pythonProcess = null;
  }
}

function connectVisionWebSocket(): void {
  if (wsClient) {
    try {
      wsClient.close();
    } catch {}
    wsClient = null;
  }

  const wsUrl = `ws://127.0.0.1:${visionPort}?token=${sessionToken}`;
  wsClient = new WebSocket(wsUrl);

  wsClient.on('open', () => {
    console.log('[ORBIT Main] Connected to Python vision WebSocket server.');
  });

  wsClient.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'status') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('orbit:status-update', msg);
        }
      } else if (msg.type === 'landmarks') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('orbit:landmarks-update', msg);
        }
      } else if (msg.type === 'pointer_position') {
        // Feed into input adapter (governed by stateMachine)
        inputAdapter.onPointerPosition(msg.x, msg.y);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('orbit:pointer-update', msg);
        }
      } else if (msg.type === 'gesture') {
        inputAdapter.onGesture(msg);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('orbit:gesture-update', msg);
        }
      } else if (msg.type === 'safety_release') {
        inputAdapter.releaseAllHeldButtons(msg.reason);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('orbit:safety-release', msg);
        }
      }
    } catch (err) {
      console.error('[ORBIT Main] Error parsing vision message:', err);
    }
  });

  wsClient.on('close', () => {
    console.log('[ORBIT Main] Vision WebSocket closed.');
  });

  wsClient.on('error', (err) => {
    console.warn('[ORBIT Main] Vision WebSocket error:', err.message);
  });
}

function sendVisionCommand(cmd: string, payload: any = {}): void {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        version: 1,
        type: 'control_command',
        command: cmd,
        payload,
        timestamp: Date.now(),
      })
    );
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 740,
    minWidth: 840,
    minHeight: 640,
    backgroundColor: '#0c0f12',
    title: 'FROSTEX ORBIT — Desktop HUD',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // In production load built file, in dev load dev server
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    // If not quitting, minimize to tray
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  // Create simple 16x16 tray icon
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVR42mNk+M9QzwABjAwM/1EwKgZgGkY1jGqAGIBuGDE0/P//n2EIxugGRgZ0xQC95QxBl1l92AAAAABJRU5ErkJggg==',
      'base64'
    )
  );

  tray = new Tray(icon);
  tray.setToolTip('FROSTEX ORBIT — Desktop Spatial Input');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open ORBIT HUD',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Start Camera Preview',
      click: () => {
        stateMachine.requestMode('PREVIEW');
        sendVisionCommand('SET_MODE', { targetMode: 'PREVIEW' });
      },
    },
    {
      label: 'Arm Hand Pointer',
      click: () => {
        stateMachine.requestMode('POINTER');
        sendVisionCommand('SET_MODE', { targetMode: 'POINTER' });
      },
    },
    {
      label: 'Emergency Pause',
      click: () => {
        stateMachine.emergencyStop();
        sendVisionCommand('EMERGENCY_STOP');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit FROSTEX ORBIT',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function setupIpcHandlers(): void {
  ipcMain.handle('orbit:get-state', () => {
    return {
      mode: stateMachine.mode,
      config: orbitConfig,
      calibration: calibrationManager.calibrationData,
    };
  });

  ipcMain.handle('orbit:set-mode', (_e, targetMode: OrbitMode) => {
    const res = stateMachine.requestMode(targetMode);
    if (res.success) {
      sendVisionCommand('SET_MODE', { targetMode });
    }
    return res;
  });

  ipcMain.handle('orbit:emergency-stop', () => {
    stateMachine.emergencyStop();
    sendVisionCommand('EMERGENCY_STOP');
  });

  ipcMain.handle('orbit:update-config', (_e, newConfig: Partial<OrbitConfig>) => {
    orbitConfig = { ...orbitConfig, ...newConfig };
    if (newConfig.targetDisplayId) {
      updateTargetDisplay(newConfig.targetDisplayId);
    }
    if (newConfig.scrollSpeedCap) {
      inputAdapter.setScrollSpeedCap(newConfig.scrollSpeedCap);
    }
    sendVisionCommand('UPDATE_CONFIG', newConfig);
  });

  ipcMain.handle('orbit:calibrate-point', (_e, { corner, x, y }) => {
    calibrationManager.setPoint(corner, x, y);
  });

  ipcMain.handle('orbit:reset-calibration', () => {
    calibrationManager.loadData({
      displayId: 'primary',
      bounds: { xMin: 0.15, yMin: 0.15, xMax: 0.85, yMax: 0.85 },
      points: {
        top_left: { x: 0.15, y: 0.15 },
        top_right: { x: 0.85, y: 0.15 },
        bottom_left: { x: 0.15, y: 0.85 },
        bottom_right: { x: 0.85, y: 0.85 },
      },
    });
  });

  ipcMain.handle('orbit:get-displays', () => {
    return getDisplaysList();
  });
}

function setupGlobalShortcuts(): void {
  // Emergency stop hotkey
  globalShortcut.register('CommandOrControl+Alt+Backspace', () => {
    console.warn('[ORBIT Hotkey] Global Emergency Stop triggered via keyboard!');
    stateMachine.emergencyStop();
    sendVisionCommand('EMERGENCY_STOP');
  });

  // Toggle HUD
  globalShortcut.register('CommandOrControl+Alt+G', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  // Escape key pauses when focused
  globalShortcut.register('Escape', () => {
    if (mainWindow && mainWindow.isFocused() && stateMachine.mode === 'POINTER') {
      stateMachine.emergencyStop();
      sendVisionCommand('EMERGENCY_STOP');
    }
  });
}

// App Lifecycle
app.whenReady().then(() => {
  setupIpcHandlers();
  setupGlobalShortcuts();
  createMainWindow();
  createTray();

  updateTargetDisplay('primary');
  spawnVisionService();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
  globalShortcut.unregisterAll();
  stateMachine.emergencyStop();
  killVisionService();
});

app.on('window-all-closed', () => {
  // Windows: keep running in system tray unless explicitly quit
});
