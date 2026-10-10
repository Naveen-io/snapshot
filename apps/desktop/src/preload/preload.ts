import { contextBridge, ipcRenderer } from 'electron';

export interface OrbitApi {
  getState: () => Promise<any>;
  setMode: (mode: string) => Promise<{ success: boolean; reason?: string }>;
  emergencyStop: () => Promise<void>;
  updateConfig: (config: any) => Promise<void>;
  calibratePoint: (corner: string, x: number, y: number) => Promise<void>;
  resetCalibration: () => Promise<void>;
  getDisplays: () => Promise<any[]>;
  onStatusUpdate: (callback: (status: any) => void) => () => void;
  onLandmarksUpdate: (callback: (landmarks: any) => void) => () => void;
  onPointerUpdate: (callback: (pointer: any) => void) => () => void;
  onGestureUpdate: (callback: (gesture: any) => void) => () => void;
  onSafetyRelease: (callback: (release: any) => void) => () => void;
}

const api: OrbitApi = {
  getState: () => ipcRenderer.invoke('orbit:get-state'),
  setMode: (mode: string) => ipcRenderer.invoke('orbit:set-mode', mode),
  emergencyStop: () => ipcRenderer.invoke('orbit:emergency-stop'),
  updateConfig: (config: any) => ipcRenderer.invoke('orbit:update-config', config),
  calibratePoint: (corner: string, x: number, y: number) =>
    ipcRenderer.invoke('orbit:calibrate-point', { corner, x, y }),
  resetCalibration: () => ipcRenderer.invoke('orbit:reset-calibration'),
  getDisplays: () => ipcRenderer.invoke('orbit:get-displays'),

  onStatusUpdate: (callback: (status: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('orbit:status-update', handler);
    return () => {
      ipcRenderer.removeListener('orbit:status-update', handler);
    };
  },

  onLandmarksUpdate: (callback: (landmarks: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('orbit:landmarks-update', handler);
    return () => {
      ipcRenderer.removeListener('orbit:landmarks-update', handler);
    };
  },

  onPointerUpdate: (callback: (pointer: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('orbit:pointer-update', handler);
    return () => {
      ipcRenderer.removeListener('orbit:pointer-update', handler);
    };
  },

  onGestureUpdate: (callback: (gesture: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('orbit:gesture-update', handler);
    return () => {
      ipcRenderer.removeListener('orbit:gesture-update', handler);
    };
  },

  onSafetyRelease: (callback: (release: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('orbit:safety-release', handler);
    return () => {
      ipcRenderer.removeListener('orbit:safety-release', handler);
    };
  },
};

contextBridge.exposeInMainWorld('orbitApi', api);
