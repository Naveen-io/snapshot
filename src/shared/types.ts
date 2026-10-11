export type ToolType =
  | 'select'
  | 'arrow'
  | 'line'
  | 'rect'
  | 'rounded-rect'
  | 'ellipse'
  | 'pen'
  | 'highlighter'
  | 'text'
  | 'callout'
  | 'step'
  | 'stamp'
  | 'loupe-annotation'
  | 'blur'
  | 'redact'
  | 'spotlight'
  | 'crop'
  | 'color-picker';

export type RedactionStyle = 'blur' | 'pixelate' | 'blackout';

export type StampType = 'check' | 'cross' | 'warning' | 'star' | 'heart' | 'question';

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  color: string;
  fillColor?: string;
  strokeWidth: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  hasBackground?: boolean;
  backgroundColor?: string;
  stepNumber?: number;
  blurRadius?: number;
  redactionStyle?: RedactionStyle;
  stampType?: StampType;
  magnification?: number;
  calloutTail?: Point;
  imageDataUrl?: string;
}

export interface GradientPreset {
  id: string;
  name: string;
  colors: string[]; // Multi-stop colors
  angle: number;
  type?: 'linear' | 'radial';
}

export interface CompositionSettings {
  padding: number;
  backgroundType: 'transparent' | 'solid' | 'gradient';
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientStops?: string[];
  gradientAngle: number;
  gradientPresetId?: string;
  borderRadius: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetY: number;
  frameType: 'none' | 'macos' | 'windows';
  showPattern: boolean;
  patternType: 'none' | 'dots' | 'grid';
  showHalo: boolean;
  haloColor: string;
  watermarkText?: string;
  showWatermark: boolean;
}

export interface GeneralSettings {
  startWithWindows: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  theme: 'dark' | 'light' | 'system';
}

export interface CaptureSettings {
  hotkey: string;
  defaultMode: 'region' | 'fullscreen' | 'window';
  defaultPostAction: 'quick-copy' | 'editor' | 'save';
  showToolbar: boolean;
  selectionColor: string;
  selectionBorderWidth: number;
  delaySeconds: number;
  multiMonitorMode: 'active' | 'all';
}

export interface ClipboardSettings {
  autoCopyOnCapture: boolean;
  copyAnnotatedExports: boolean;
  notifyOnCopy: boolean;
}

export interface SavingSettings {
  saveDirectory: string;
  defaultFormat: 'png' | 'jpeg' | 'webp';
  filenamePattern: string;
  autoSave: boolean;
  quality: number;
}

export interface HistorySettings {
  enabled: boolean;
  maxItems: number;
  retentionDays: number;
  autoOcrIndex: boolean;
}

export interface EditorSettings {
  defaultTool: ToolType;
  defaultColor: string;
  defaultStrokeWidth: number;
  defaultRedactionStyle: RedactionStyle;
}

export interface AppSettings {
  general: GeneralSettings;
  capture: CaptureSettings;
  clipboard: ClipboardSettings;
  saving: SavingSettings;
  history: HistorySettings;
  editor: EditorSettings;
}

export interface DisplayInfo {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  isPrimary: boolean;
  isActive?: boolean;
}

export interface ScreenData {
  displayId: number;
  bounds: { x: number; y: number; width: number; height: number };
  dataUrl: string;
  scaleFactor: number;
  isPrimary: boolean;
  isActive: boolean;
}

export interface CaptureResult {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

export type AppleCaptureMode =
  | 'capture-screen'
  | 'capture-window'
  | 'capture-portion'
  | 'record-screen'
  | 'record-portion';

export interface ScreenshotHistoryItem {
  id: string;
  createdAt: string;
  fileName: string;
  filePath?: string;
  dataUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileSize: number;
  format: 'png' | 'jpeg' | 'webp' | 'webm';
  type?: 'screenshot' | 'video';
  duration?: number;
  videoUrl?: string;
  ocrText?: string;
}

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality?: number;
  scale?: number;
  width?: number;
  height?: number;
  saveToFile?: boolean;
  copyToClipboard?: boolean;
  filePath?: string;
}

export interface WindowCaptureTarget {
  id: string;
  name: string;
  thumbnail: string;
  appIcon?: string;
}

export interface OcrResult {
  text: string;
  confidence: number;
  lines: string[];
}

export interface GuideStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  imageDataUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  badgeColor?: string;
}

export interface Guide {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  steps: GuideStep[];
}

export type ComposeLayout = 'horizontal' | 'vertical' | 'grid';
export type ComposeAlignment = 'start' | 'center' | 'end';

export interface ComposeItem {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  label?: string;
  sublabel?: string;
}

export interface ComposePreset {
  id: string;
  name: string;
  layout: ComposeLayout;
  spacing: number;
  padding: number;
  alignment: ComposeAlignment;
  showDividers: boolean;
  dividerColor: string;
  dividerWidth: number;
  showLabels: boolean;
  frameType: 'none' | 'macos' | 'windows';
  borderRadius: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetY: number;
  backgroundType: 'transparent' | 'solid' | 'gradient';
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  gradientStops?: string[];
  gradientPresetId?: string;
}
