import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { AppSettings, ScreenshotHistoryItem, ExportOptions, Guide, ComposePreset } from '../shared/types';

const snapshotAPI = {
  // Capture workflows
  startCapture: () => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_START),
  cancelCapture: () => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_CANCEL),
  switchDisplay: (bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_SWITCH_DISPLAY, bounds),
  getCaptureDisplays: () => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_GET_DISPLAYS),
  getWindowSources: () => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_GET_SOURCES),

  // Fast action triggers
  quickCopy: (payload: { dataUrl: string; width: number; height: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.QUICK_COPY, payload),
  openEditor: (payload: { dataUrl: string; width: number; height: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_EDITOR, payload),
  saveCapture: (payload: { dataUrl: string; width: number; height: number; format?: 'png' | 'jpeg' | 'webp' }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_CAPTURE, payload),
  pinCapture: (payload: { dataUrl: string; width: number; height: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.PIN_CAPTURE, payload),

  // Clipboard & Files
  copyImage: (dataUrl: string) => ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE_IMAGE, dataUrl),
  copyText: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE_TEXT, text),
  saveImage: (options: { dataUrl: string; format?: 'png' | 'jpeg' | 'webp'; quality?: number; targetPath?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE_IMAGE, options),
  saveVideo: (payload: { base64: string; duration?: number; width?: number; height?: number; filename?: string }): Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE_VIDEO, payload),
  selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_SELECT_DIRECTORY),
  showInFolder: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_SHOW_IN_FOLDER, filePath),

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings),
  registerHotkey: (hotkey: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_REGISTER_HOTKEY, hotkey),

  // History
  getHistory: (): Promise<ScreenshotHistoryItem[]> => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET_ALL),
  deleteHistoryItem: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE, id),
  clearHistory: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_CLEAR),
  updateHistoryItem: (id: string, updates: Partial<ScreenshotHistoryItem>): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_UPDATE, { id, updates }),

  // Flow Guides
  getGuides: (): Promise<Guide[]> => ipcRenderer.invoke(IPC_CHANNELS.GUIDES_GET_ALL),
  saveGuide: (guide: Guide): Promise<Guide> => ipcRenderer.invoke(IPC_CHANNELS.GUIDES_SAVE, guide),
  deleteGuide: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.GUIDES_DELETE, id),
  exportFlowPdf: (payload: { html: string; defaultName?: string }): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.FLOW_EXPORT_PDF, payload),
  exportFlowHtml: (payload: { html: string; defaultName?: string }): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.FLOW_EXPORT_HTML, payload),
  exportFlowMarkdown: (payload: { markdown: string; defaultName?: string }): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.FLOW_EXPORT_MARKDOWN, payload),

  // Compose Presets
  getComposePresets: (): Promise<ComposePreset[]> => ipcRenderer.invoke(IPC_CHANNELS.COMPOSE_PRESETS_GET),
  saveComposePreset: (preset: ComposePreset): Promise<ComposePreset> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMPOSE_PRESETS_SAVE, preset),
  deleteComposePreset: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.COMPOSE_PRESETS_DELETE, id),

  // Window Management
  windowMinimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  windowMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  windowClose: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  setPinOpacity: (opacity: number) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_PIN_OPACITY, opacity),

  // Events Listeners
  onCaptureDisplays: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.CAPTURE_DISPLAYS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CAPTURE_DISPLAYS, handler);
  },
  onImageLoadedForEditor: (callback: (dataUrl: string) => void) => {
    const handler = (_: any, dataUrl: string) => callback(dataUrl);
    ipcRenderer.on('event:image-loaded-for-editor', handler);
    return () => ipcRenderer.removeListener('event:image-loaded-for-editor', handler);
  },
  onPinImageLoaded: (callback: (data: { dataUrl: string; width: number; height: number }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('event:pin-image-loaded', handler);
    return () => ipcRenderer.removeListener('event:pin-image-loaded', handler);
  },
  onNavigate: (callback: (view: string) => void) => {
    const handler = (_: any, view: string) => callback(view);
    ipcRenderer.on('navigation:go-to', handler);
    return () => ipcRenderer.removeListener('navigation:go-to', handler);
  }
};

contextBridge.exposeInMainWorld('snapshotAPI', snapshotAPI);

export type SnapshotAPI = typeof snapshotAPI;
