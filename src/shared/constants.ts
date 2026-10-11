import { AppSettings, CompositionSettings, GradientPreset, ComposePreset } from './types';

export const IPC_CHANNELS = {
  // Capture
  CAPTURE_START: 'capture:start',
  CAPTURE_COMPLETE: 'capture:complete',
  CAPTURE_CANCEL: 'capture:cancel',
  CAPTURE_GET_SOURCES: 'capture:get-sources',
  CAPTURE_DISPLAYS: 'capture:displays',
  CAPTURE_GET_DISPLAYS: 'capture:get-displays',
  CAPTURE_SWITCH_DISPLAY: 'capture:switch-display',
  CAPTURE_ACTIVE_DISPLAY_IMAGE: 'capture:active-display-image',

  // Actions
  QUICK_COPY: 'action:quick-copy',
  OPEN_EDITOR: 'action:open-editor',
  SAVE_CAPTURE: 'action:save-capture',
  PIN_CAPTURE: 'action:pin-capture',

  // Clipboard
  CLIPBOARD_WRITE_IMAGE: 'clipboard:write-image',
  CLIPBOARD_WRITE_TEXT: 'clipboard:write-text',
  CLIPBOARD_READ_IMAGE: 'clipboard:read-image',

  // File Operations
  FILE_SAVE_IMAGE: 'file:save-image',
  FILE_SAVE_VIDEO: 'file:save-video',
  FILE_SELECT_DIRECTORY: 'file:select-directory',
  FILE_SHOW_IN_FOLDER: 'file:show-in-folder',
  FILE_DELETE: 'file:delete',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',
  SETTINGS_REGISTER_HOTKEY: 'settings:register-hotkey',

  // History
  HISTORY_GET_ALL: 'history:get-all',
  HISTORY_ADD: 'history:add',
  HISTORY_UPDATE: 'history:update',
  HISTORY_DELETE: 'history:delete',
  HISTORY_CLEAR: 'history:clear',

  // Flow Guides
  GUIDES_GET_ALL: 'guides:get-all',
  GUIDES_SAVE: 'guides:save',
  GUIDES_DELETE: 'guides:delete',
  FLOW_EXPORT_PDF: 'flow:export-pdf',
  FLOW_EXPORT_HTML: 'flow:export-html',
  FLOW_EXPORT_MARKDOWN: 'flow:export-markdown',

  // Compose Presets
  COMPOSE_PRESETS_GET: 'compose:presets-get',
  COMPOSE_PRESETS_SAVE: 'compose:presets-save',
  COMPOSE_PRESETS_DELETE: 'compose:presets-delete',

  // Window management
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_PIN_CLOSE: 'window:pin-close',
  WINDOW_SET_PIN_OPACITY: 'window:pin-opacity',

  // Events
  EVENT_CAPTURE_TRIGGERED: 'event:capture-triggered',
  EVENT_IMAGE_LOADED_FOR_EDITOR: 'event:image-loaded-for-editor',
  EVENT_PIN_IMAGE_LOADED: 'event:pin-image-loaded'
} as const;

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'velvet-sunset',
    name: 'Velvet Sunset',
    colors: ['#f97316', '#ec4899', '#8b5cf6'],
    angle: 135
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    colors: ['#06b6d4', '#3b82f6', '#9333ea'],
    angle: 135
  },
  {
    id: 'hyper-aura',
    name: 'Hyper Aura',
    colors: ['#ec4899', '#a855f7', '#6366f1'],
    angle: 135
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    colors: ['#059669', '#0d9488', '#0284c7'],
    angle: 135
  },
  {
    id: 'candy-twilight',
    name: 'Candy Twilight',
    colors: ['#ff758c', '#ff7eb3', '#7873f5'],
    angle: 135
  },
  {
    id: 'obsidian-luxe',
    name: 'Obsidian Luxe',
    colors: ['#090d16', '#111827', '#1f2937'],
    angle: 135
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    colors: ['#fbbf24', '#f97316', '#dc2626'],
    angle: 135
  },
  {
    id: 'deep-amethyst',
    name: 'Deep Amethyst',
    colors: ['#3b0764', '#581c87', '#7e22ce'],
    angle: 135
  },
  {
    id: 'soft-pearl',
    name: 'Soft Pearl',
    colors: ['#e0c3fc', '#8ec5fc'],
    angle: 135
  },
  {
    id: 'emerald-abyss',
    name: 'Emerald Abyss',
    colors: ['#064e3b', '#047857', '#10b981'],
    angle: 135
  },
  {
    id: 'midnight-slate',
    name: 'Midnight Studio',
    colors: ['#1e293b', '#0f172a'],
    angle: 135
  },
  {
    id: 'pure-carbon',
    name: 'Pure Carbon',
    colors: ['#27272a', '#09090b'],
    angle: 135
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    startWithWindows: false,
    startMinimized: false,
    closeToTray: true,
    theme: 'dark'
  },
  capture: {
    hotkey: 'CommandOrControl+Shift+S',
    defaultMode: 'region',
    defaultPostAction: 'quick-copy',
    showToolbar: true,
    selectionColor: '#ffffff',
    selectionBorderWidth: 2,
    delaySeconds: 0,
    multiMonitorMode: 'active'
  },
  clipboard: {
    autoCopyOnCapture: true,
    copyAnnotatedExports: true,
    notifyOnCopy: true
  },
  saving: {
    saveDirectory: '',
    defaultFormat: 'png',
    filenamePattern: 'Screenshot_{YYYY}-{MM}-{DD}_{HH}{mm}{ss}',
    autoSave: false,
    quality: 95
  },
  history: {
    enabled: true,
    maxItems: 200,
    retentionDays: 30,
    autoOcrIndex: true
  },
  editor: {
    defaultTool: 'arrow',
    defaultColor: '#ef4444',
    defaultStrokeWidth: 4,
    defaultRedactionStyle: 'blur'
  }
};

export const RAW_COMPOSITION: CompositionSettings = {
  padding: 0,
  backgroundType: 'solid',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  gradientFrom: '#1e293b',
  gradientTo: '#0f172a',
  gradientStops: ['#1e293b', '#0f172a'],
  gradientAngle: 135,
  gradientPresetId: 'midnight-slate',
  borderRadius: 0,
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  shadowOffsetY: 0,
  frameType: 'none',
  showPattern: false,
  patternType: 'none',
  showHalo: false,
  haloColor: 'rgba(0, 0, 0, 0)',
  showWatermark: false,
  watermarkText: ''
};

export const DEFAULT_COMPOSITION: CompositionSettings = RAW_COMPOSITION;

export const COLOR_SWATCHES = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ffffff', // White
  '#090d16'  // Charcoal
];

export const DEFAULT_COMPOSE_PRESETS: ComposePreset[] = [
  {
    id: 'clean-charcoal',
    name: 'Clean Charcoal',
    layout: 'horizontal',
    spacing: 24,
    padding: 36,
    alignment: 'center',
    showDividers: true,
    dividerColor: '#374151',
    dividerWidth: 1,
    showLabels: true,
    frameType: 'windows',
    borderRadius: 10,
    shadowBlur: 24,
    shadowColor: 'rgba(0, 0, 0, 0.45)',
    shadowOffsetY: 8,
    backgroundType: 'solid',
    backgroundColor: '#111827',
    gradientFrom: '#111827',
    gradientTo: '#1f2937',
    gradientAngle: 135
  },
  {
    id: 'side-by-side',
    name: 'Side-by-Side Comparison',
    layout: 'horizontal',
    spacing: 20,
    padding: 32,
    alignment: 'center',
    showDividers: true,
    dividerColor: '#ffffff',
    dividerWidth: 2,
    showLabels: true,
    frameType: 'none',
    borderRadius: 8,
    shadowBlur: 20,
    shadowColor: 'rgba(0, 0, 0, 0.35)',
    shadowOffsetY: 6,
    backgroundType: 'solid',
    backgroundColor: '#0f172a',
    gradientFrom: '#0f172a',
    gradientTo: '#1e293b',
    gradientAngle: 90
  },
  {
    id: 'vertical-flow',
    name: 'Vertical Workflow',
    layout: 'vertical',
    spacing: 24,
    padding: 32,
    alignment: 'center',
    showDividers: true,
    dividerColor: '#27272a',
    dividerWidth: 1,
    showLabels: true,
    frameType: 'windows',
    borderRadius: 12,
    shadowBlur: 24,
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowOffsetY: 8,
    backgroundType: 'solid',
    backgroundColor: '#18181b',
    gradientFrom: '#18181b',
    gradientTo: '#27272a',
    gradientAngle: 180
  },
  {
    id: 'obsidian-luxe',
    name: 'Obsidian Luxe',
    layout: 'horizontal',
    spacing: 28,
    padding: 44,
    alignment: 'center',
    showDividers: false,
    dividerColor: '#374151',
    dividerWidth: 1,
    showLabels: false,
    frameType: 'macos',
    borderRadius: 14,
    shadowBlur: 36,
    shadowColor: 'rgba(0, 0, 0, 0.6)',
    shadowOffsetY: 12,
    backgroundType: 'gradient',
    backgroundColor: '#090d16',
    gradientFrom: '#090d16',
    gradientTo: '#1f2937',
    gradientAngle: 135,
    gradientStops: ['#090d16', '#111827', '#1f2937']
  },
  {
    id: 'transparent-pure',
    name: 'Transparent Clean',
    layout: 'horizontal',
    spacing: 16,
    padding: 0,
    alignment: 'center',
    showDividers: false,
    dividerColor: '#374151',
    dividerWidth: 1,
    showLabels: false,
    frameType: 'none',
    borderRadius: 0,
    shadowBlur: 0,
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowOffsetY: 0,
    backgroundType: 'transparent',
    backgroundColor: '#000000',
    gradientFrom: '#000000',
    gradientTo: '#000000',
    gradientAngle: 0
  }
];

export const DEFAULT_COMPOSE_CONFIG: ComposePreset = DEFAULT_COMPOSE_PRESETS[0];
