import { app, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';
import { AppSettings, ScreenshotHistoryItem, Guide, ComposePreset } from '../shared/types';
import { DEFAULT_SETTINGS, DEFAULT_COMPOSE_PRESETS } from '../shared/constants';

export class StorageService {
  private userDataPath: string;
  private settingsFilePath: string;
  private historyFilePath: string;
  private guidesFilePath: string;
  private composePresetsFilePath: string;
  private capturesDirPath: string;
  private cachedSettings: AppSettings | null = null;
  private cachedHistory: ScreenshotHistoryItem[] | null = null;
  private cachedGuides: Guide[] | null = null;
  private cachedComposePresets: ComposePreset[] | null = null;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.settingsFilePath = path.join(this.userDataPath, 'settings.json');
    this.historyFilePath = path.join(this.userDataPath, 'history.json');
    this.guidesFilePath = path.join(this.userDataPath, 'guides.json');
    this.composePresetsFilePath = path.join(this.userDataPath, 'compose_presets.json');
    this.capturesDirPath = path.join(this.userDataPath, 'captures');

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.userDataPath)) {
      fs.mkdirSync(this.userDataPath, { recursive: true });
    }
    if (!fs.existsSync(this.capturesDirPath)) {
      fs.mkdirSync(this.capturesDirPath, { recursive: true });
    }
  }

  private atomicWriteFileSync(filePath: string, data: string): void {
    const tmpPath = `${filePath}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tmpPath, data, 'utf-8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      if (fs.existsSync(tmpPath)) {
        try {
          fs.unlinkSync(tmpPath);
        } catch {
          // Ignore
        }
      }
      throw err;
    }
  }

  public getSettings(): AppSettings {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const raw = fs.readFileSync(this.settingsFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Deep merge with default settings in case of new schema versions
        this.cachedSettings = {
          general: { ...DEFAULT_SETTINGS.general, ...(parsed.general || {}) },
          capture: { ...DEFAULT_SETTINGS.capture, ...(parsed.capture || {}) },
          clipboard: { ...DEFAULT_SETTINGS.clipboard, ...(parsed.clipboard || {}) },
          saving: {
            ...DEFAULT_SETTINGS.saving,
            saveDirectory: parsed.saving?.saveDirectory || path.join(app.getPath('pictures'), 'Screenshots'),
            ...(parsed.saving || {})
          },
          history: { ...DEFAULT_SETTINGS.history, ...(parsed.history || {}) },
          editor: { ...DEFAULT_SETTINGS.editor, ...(parsed.editor || {}) }
        };
        return this.cachedSettings;
      }
    } catch (err) {
      console.error('Failed to read settings, using defaults:', err);
    }

    const defaultWithPictures = {
      ...DEFAULT_SETTINGS,
      saving: {
        ...DEFAULT_SETTINGS.saving,
        saveDirectory: path.join(app.getPath('pictures'), 'Screenshots')
      }
    };
    this.cachedSettings = defaultWithPictures;
    this.saveSettings(defaultWithPictures);
    return this.cachedSettings;
  }

  public saveSettings(newSettings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    this.cachedSettings = {
      general: { ...current.general, ...(newSettings.general || {}) },
      capture: { ...current.capture, ...(newSettings.capture || {}) },
      clipboard: { ...current.clipboard, ...(newSettings.clipboard || {}) },
      saving: { ...current.saving, ...(newSettings.saving || {}) },
      history: { ...current.history, ...(newSettings.history || {}) },
      editor: { ...current.editor, ...(newSettings.editor || {}) }
    };

    try {
      this.atomicWriteFileSync(this.settingsFilePath, JSON.stringify(this.cachedSettings, null, 2));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }

    return this.cachedSettings;
  }

  public getHistory(): ScreenshotHistoryItem[] {
    if (this.cachedHistory) {
      return this.cachedHistory;
    }

    try {
      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, 'utf-8');
        this.cachedHistory = JSON.parse(raw);
        return this.cachedHistory || [];
      }
    } catch (err) {
      console.error('Failed to read history:', err);
    }

    this.cachedHistory = [];
    return [];
  }

  public async addHistoryItem(
    item: {
      dataUrl: string;
      width: number;
      height: number;
      fileSize?: number;
      format?: 'png' | 'jpeg' | 'webp' | 'webm';
      filePath?: string;
      ocrText?: string;
      type?: 'screenshot' | 'video';
      duration?: number;
    }
  ): Promise<ScreenshotHistoryItem> {
    const settings = this.getSettings();
    if (!settings.history.enabled) {
      // History is disabled by user
      const placeholderId = `shot_${Date.now()}`;
      return {
        id: placeholderId,
        createdAt: new Date().toISOString(),
        fileName: item.filePath ? path.basename(item.filePath) : `snapshot_${placeholderId}.${item.format || 'png'}`,
        filePath: item.filePath,
        dataUrl: item.dataUrl,
        thumbnailUrl: item.dataUrl,
        width: item.width,
        height: item.height,
        fileSize: item.fileSize || 0,
        format: item.format || 'png',
        type: item.type || 'screenshot',
        duration: item.duration,
        ocrText: item.ocrText
      };
    }

    const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();
    const format = item.format || (item.type === 'video' ? 'webm' : 'png');
    const fileName = item.filePath ? path.basename(item.filePath) : `snapshot_${id}.${format}`;
    const storageImagePath = path.join(this.capturesDirPath, fileName);

    // Save image buffer to local disk captures folder if dataUrl exists
    if (item.dataUrl && item.dataUrl.startsWith('data:image')) {
      try {
        const base64Data = item.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(storageImagePath, buffer);
      } catch (err) {
        console.error('Failed to write history image to disk:', err);
      }
    }

    // Generate smaller thumbnail for fast grid rendering
    let thumbnailUrl = item.dataUrl;
    if (item.dataUrl && item.dataUrl.startsWith('data:image')) {
      try {
        const image = nativeImage.createFromDataURL(item.dataUrl);
        const thumb = image.resize({ width: 320, quality: 'good' });
        thumbnailUrl = thumb.toDataURL();
      } catch {
        // Fallback to original
      }
    }

    const historyItem: ScreenshotHistoryItem = {
      id,
      createdAt,
      fileName,
      filePath: item.filePath || storageImagePath,
      dataUrl: item.dataUrl,
      thumbnailUrl,
      width: item.width,
      height: item.height,
      fileSize: item.fileSize || Math.round(item.dataUrl ? item.dataUrl.length * 0.75 : 0),
      format,
      type: item.type || 'screenshot',
      duration: item.duration,
      ocrText: item.ocrText
    };

    const history = this.getHistory();
    history.unshift(historyItem);

    // Apply storage limits
    if (history.length > settings.history.maxItems) {
      const removed = history.splice(settings.history.maxItems);
      for (const rem of removed) {
        if (rem.filePath && rem.filePath.startsWith(this.capturesDirPath)) {
          try {
            if (fs.existsSync(rem.filePath)) fs.unlinkSync(rem.filePath);
          } catch {
            // Ignore
          }
        }
      }
    }

    this.cachedHistory = history;
    try {
      this.atomicWriteFileSync(this.historyFilePath, JSON.stringify(history, null, 2));
    } catch (err) {
      console.error('Failed to save history index:', err);
    }

    return historyItem;
  }

  public updateHistoryItem(id: string, updates: Partial<ScreenshotHistoryItem>): void {
    const history = this.getHistory();
    const index = history.findIndex((h) => h.id === id);
    if (index !== -1) {
      history[index] = { ...history[index], ...updates };
      this.cachedHistory = history;
      try {
        this.atomicWriteFileSync(this.historyFilePath, JSON.stringify(history, null, 2));
      } catch (err) {
        console.error('Failed to update history item:', err);
      }
    }
  }

  public async deleteHistoryItem(id: string): Promise<boolean> {
    const history = this.getHistory();
    const index = history.findIndex((h) => h.id === id);
    if (index === -1) return false;

    const [deleted] = history.splice(index, 1);
    this.cachedHistory = history;

    if (deleted.filePath && deleted.filePath.startsWith(this.capturesDirPath)) {
      try {
        if (fs.existsSync(deleted.filePath)) fs.unlinkSync(deleted.filePath);
      } catch {
        // Ignore
      }
    }

    try {
      this.atomicWriteFileSync(this.historyFilePath, JSON.stringify(history, null, 2));
      return true;
    } catch (err) {
      console.error('Failed to save updated history:', err);
      return false;
    }
  }

  public async clearHistory(): Promise<boolean> {
    const history = this.getHistory();
    for (const item of history) {
      if (item.filePath && item.filePath.startsWith(this.capturesDirPath)) {
        try {
          if (fs.existsSync(item.filePath)) fs.unlinkSync(item.filePath);
        } catch {
          // Ignore
        }
      }
    }

    this.cachedHistory = [];
    try {
      this.atomicWriteFileSync(this.historyFilePath, JSON.stringify([], null, 2));
      return true;
    } catch (err) {
      console.error('Failed to clear history:', err);
      return false;
    }
  }

  // --- Flow Guides Storage ---

  public getGuides(): Guide[] {
    if (this.cachedGuides) {
      return this.cachedGuides;
    }

    try {
      if (fs.existsSync(this.guidesFilePath)) {
        const raw = fs.readFileSync(this.guidesFilePath, 'utf-8');
        this.cachedGuides = JSON.parse(raw);
        return this.cachedGuides || [];
      }
    } catch (err) {
      console.error('Failed to read guides storage:', err);
    }

    this.cachedGuides = [];
    return [];
  }

  public saveGuide(guide: Guide): Guide {
    const list = this.getGuides();
    const index = list.findIndex((g) => g.id === guide.id);
    const updatedGuide: Guide = {
      ...guide,
      updatedAt: new Date().toISOString()
    };

    if (index !== -1) {
      list[index] = updatedGuide;
    } else {
      list.unshift(updatedGuide);
    }

    this.cachedGuides = list;
    try {
      this.atomicWriteFileSync(this.guidesFilePath, JSON.stringify(list, null, 2));
    } catch (err) {
      console.error('Failed to persist guides file:', err);
    }

    return updatedGuide;
  }

  public deleteGuide(id: string): boolean {
    const list = this.getGuides();
    const index = list.findIndex((g) => g.id === id);
    if (index === -1) return false;

    list.splice(index, 1);
    this.cachedGuides = list;
    try {
      this.atomicWriteFileSync(this.guidesFilePath, JSON.stringify(list, null, 2));
      return true;
    } catch (err) {
      console.error('Failed to delete guide:', err);
      return false;
    }
  }

  // --- Compose Presets Storage ---

  public getComposePresets(): ComposePreset[] {
    if (this.cachedComposePresets) {
      return this.cachedComposePresets;
    }

    try {
      if (fs.existsSync(this.composePresetsFilePath)) {
        const raw = fs.readFileSync(this.composePresetsFilePath, 'utf-8');
        const userPresets = JSON.parse(raw);
        // Merge user presets with defaults if any
        const combined = [...DEFAULT_COMPOSE_PRESETS];
        for (const up of userPresets) {
          const exists = combined.findIndex((p) => p.id === up.id);
          if (exists !== -1) {
            combined[exists] = up;
          } else {
            combined.push(up);
          }
        }
        this.cachedComposePresets = combined;
        return this.cachedComposePresets;
      }
    } catch (err) {
      console.error('Failed to read compose presets:', err);
    }

    this.cachedComposePresets = [...DEFAULT_COMPOSE_PRESETS];
    return this.cachedComposePresets;
  }

  public saveComposePreset(preset: ComposePreset): ComposePreset {
    const presets = this.getComposePresets();
    const index = presets.findIndex((p) => p.id === preset.id);

    if (index !== -1) {
      presets[index] = preset;
    } else {
      presets.push(preset);
    }

    this.cachedComposePresets = presets;

    try {
      // Save only custom or overridden presets to disk
      this.atomicWriteFileSync(this.composePresetsFilePath, JSON.stringify(presets, null, 2));
    } catch (err) {
      console.error('Failed to save compose presets:', err);
    }

    return preset;
  }

  public deleteComposePreset(id: string): boolean {
    // Cannot delete default built-in presets
    const isDefault = DEFAULT_COMPOSE_PRESETS.some((p) => p.id === id);
    if (isDefault) return false;

    const presets = this.getComposePresets();
    const index = presets.findIndex((p) => p.id === id);
    if (index === -1) return false;

    presets.splice(index, 1);
    this.cachedComposePresets = presets;

    try {
      this.atomicWriteFileSync(this.composePresetsFilePath, JSON.stringify(presets, null, 2));
      return true;
    } catch (err) {
      console.error('Failed to delete compose preset:', err);
      return false;
    }
  }
}
