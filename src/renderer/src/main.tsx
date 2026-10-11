import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { EditorToolbar } from './components/EditorToolbar';
import { ToolProperties } from './components/ToolProperties';
import { CompositionStudio } from './components/CompositionStudio';
import { EditorCanvas } from './components/EditorCanvas';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { ExportModal } from './components/ExportModal';
import { OcrModal } from './components/OcrModal';
import { ScreenshotPreviewModal } from './components/ScreenshotPreviewModal';
import { DiffView } from './components/DiffView';
import { FlowGuideView } from './components/FlowGuideView';
import { ComposeStudioView } from './components/ComposeStudioView';
import { ToolType, Annotation, CompositionSettings, RedactionStyle, StampType, ScreenshotHistoryItem } from '@shared/types';
import { DEFAULT_COMPOSITION } from '@shared/constants';
import {
  Camera,
  Clock,
  Settings as SettingsIcon,
  Minus,
  Square,
  X,
  ClipboardPaste,
  Image as ImageIcon,
  Sparkles,
  Command,
  ArrowRight,
  ShieldCheck,
  FolderOpen,
  GitCompare,
  BookOpen,
  Layers
} from 'lucide-react';
import './styles/theme.css';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'diff' | 'flow' | 'compose' | 'history' | 'settings'>('editor');
  const [currentTool, setCurrentTool] = useState<ToolType>('arrow');
  const [selectedColor, setSelectedColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [fontSize, setFontSize] = useState<number>(20);
  const [fontFamily, setFontFamily] = useState<string>('Segoe UI, sans-serif');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('bold');
  const [hasBackground, setHasBackground] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [redactionStyle, setRedactionStyle] = useState<RedactionStyle>('blur');
  const [stampType, setStampType] = useState<StampType>('check');
  const [magnification, setMagnification] = useState<number>(2);

  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Base screenshot image
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [rawImageDataUrl, setRawImageDataUrl] = useState<string | null>(null);

  // Annotations & Undo/Redo history stack
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [historyStack, setHistoryStack] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Composition studio
  const [composition, setComposition] = useState<CompositionSettings>(DEFAULT_COMPOSITION);
  const [isCompositionOpen, setIsCompositionOpen] = useState<boolean>(false);

  // Modals & Toast
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isOcrOpen, setIsOcrOpen] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<ScreenshotHistoryItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Recent captures for home page strip
  const [recentCaptures, setRecentCaptures] = useState<ScreenshotHistoryItem[]>([]);

  const exportTriggerRef = useRef<((format?: string, quality?: number) => string) | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadRecentCaptures = async () => {
    if (window.snapshotAPI) {
      const list = await window.snapshotAPI.getHistory();
      setRecentCaptures((list || []).slice(0, 6));
    }
  };

  // Load image from data URL into HTMLImageElement
  const loadImage = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      setBaseImage(img);
      setRawImageDataUrl(dataUrl);
      setAnnotations([]);
      setHistoryStack([[]]);
      setHistoryIndex(0);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setZoom(1);
      setActiveTab('editor');
    };
    img.src = dataUrl;
  };

  useEffect(() => {
    loadRecentCaptures();
  }, [baseImage, activeTab]);

  // Listen for image loaded from Main process (e.g. from capture overlay 'E' or tray)
  useEffect(() => {
    if (!window.snapshotAPI) return;

    const cleanupImg = window.snapshotAPI.onImageLoadedForEditor((dataUrl) => {
      loadImage(dataUrl);
    });

    const cleanupNav = window.snapshotAPI.onNavigate((targetView) => {
      if (['editor', 'diff', 'flow', 'compose', 'history', 'settings'].includes(targetView)) {
        setActiveTab(targetView as any);
      }
    });

    return () => {
      cleanupImg();
      cleanupNav();
    };
  }, []);

  const handleUpdateAnnotations = (newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(newAnnotations);
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setAnnotations(historyStack[newIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setAnnotations(historyStack[newIdx]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedAnnotationId) {
      const filtered = annotations.filter((a) => a.id !== selectedAnnotationId);
      handleUpdateAnnotations(filtered);
      setSelectedAnnotationId(null);
    }
  };

  const handleInsertImage = (dataUrl: string) => {
    if (!baseImage) return;
    const newAnn: Annotation = {
      id: `ann_${Date.now()}`,
      type: 'stamp',
      x: 60,
      y: 60,
      width: 220,
      height: 160,
      color: '#ffffff',
      strokeWidth: 2,
      imageDataUrl: dataUrl
    };
    handleUpdateAnnotations([...annotations, newAnn]);
    setSelectedAnnotationId(newAnn.id);
    showToast('Image sticker inserted');
  };

  // Trigger screenshot
  const handleTakeScreenshot = async () => {
    if (window.snapshotAPI) {
      await window.snapshotAPI.startCapture();
    }
  };

  // Paste image from clipboard
  const handlePasteClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                loadImage(e.target.result as string);
                showToast('Image pasted from clipboard');
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      showToast('No image found in clipboard');
    } catch {
      showToast('Clipboard access unavailable or empty');
    }
  };

  // File drag & drop support
  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            loadImage(evt.target.result as string);
            showToast('Image opened in editor');
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Global window keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) handleRedo();
          else handleUndo();
        } else if (e.key === 'y' || e.key === 'Y') {
          handleRedo();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          if (baseImage) setIsExportOpen(true);
        } else if (e.key === 'c' || e.key === 'C') {
          if (baseImage && !window.getSelection()?.toString()) {
            handleCopyCanvasResult();
          }
        } else if (e.key === 'v' || e.key === 'V') {
          handlePasteClipboard();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId) {
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyStack, baseImage, selectedAnnotationId]);

  const handleCopyCanvasResult = async () => {
    if (exportTriggerRef.current && window.snapshotAPI) {
      const dataUrl = exportTriggerRef.current('png', 95);
      await window.snapshotAPI.copyImage(dataUrl);
      showToast('Screenshot copied to clipboard');
    }
  };

  const handleSaveExport = async (format: 'png' | 'jpeg' | 'webp', quality: number) => {
    if (exportTriggerRef.current && window.snapshotAPI) {
      const dataUrl = exportTriggerRef.current(format, quality);
      const res = await window.snapshotAPI.saveImage({ dataUrl, format, quality });
      if (res.success) {
        showToast('Image saved successfully');
      } else {
        showToast('Failed to save file: ' + res.error);
      }
    }
  };

  const handleCopyExport = async (format: 'png' | 'jpeg' | 'webp', quality: number) => {
    if (exportTriggerRef.current && window.snapshotAPI) {
      const dataUrl = exportTriggerRef.current(format, quality);
      await window.snapshotAPI.copyImage(dataUrl);
      showToast('Image copied to clipboard');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-app)'
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropFile}
    >
      {/* Sleek Custom Apple-Style Window Titlebar */}
      <div className="titlebar-drag-region" style={{ backgroundColor: '#0c0d10', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', height: '42px', padding: '0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="./icon.png" alt="App Icon" style={{ width: 17, height: 17, borderRadius: 4 }} />
          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.8px', color: '#ffffff' }}>
            SNAPSHOT
          </span>

          {/* Quick Capture Button */}
          <button
            type="button"
            onClick={handleTakeScreenshot}
            className="primary titlebar-no-drag"
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 600,
              marginLeft: 10,
              borderRadius: '7px',
              backgroundColor: '#ffffff',
              color: '#0c0d10',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
            title="Take Screenshot (Ctrl+Shift+S)"
          >
            <Camera size={12} />
            <span>Capture</span>
            <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: 2 }}>↵</span>
          </button>
        </div>

        {/* Apple Segmented View Switcher Tabs */}
        <div
          className="titlebar-no-drag"
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '2px',
            gap: 2
          }}
        >
          {[
            { id: 'editor', label: 'Editor', icon: <ImageIcon size={13} /> },
            { id: 'diff', label: 'Diff', icon: <GitCompare size={13} /> },
            { id: 'flow', label: 'Flow Guides', icon: <BookOpen size={13} /> },
            { id: 'compose', label: 'Compose', icon: <Sparkles size={13} /> },
            { id: 'history', label: 'History', icon: <Clock size={13} /> },
            { id: 'settings', label: 'Settings', icon: <SettingsIcon size={13} /> }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className="ghost"
                style={{
                  padding: '4px 11px',
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  gap: 5,
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease'
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Window controls */}
        <div className="titlebar-no-drag" style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => window.snapshotAPI?.windowMinimize()}
            className="ghost"
            style={{ padding: '6px 10px', borderRadius: 0 }}
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={() => window.snapshotAPI?.windowMaximize()}
            className="ghost"
            style={{ padding: '6px 10px', borderRadius: 0 }}
            title="Maximize / Restore"
          >
            <Square size={12} />
          </button>
          <button
            onClick={() => window.snapshotAPI?.windowClose()}
            className="ghost"
            style={{ padding: '6px 10px', borderRadius: 0, color: 'var(--text-secondary)' }}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {baseImage ? (
              <>
                <EditorToolbar
                  currentTool={currentTool}
                  onSelectTool={setCurrentTool}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < historyStack.length - 1}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  zoom={zoom}
                  onZoomIn={() => setZoom((z) => Math.min(3, z + 0.15))}
                  onZoomOut={() => setZoom((z) => Math.max(0.2, z - 0.15))}
                  onZoomFit={() => setZoom(1)}
                  onRotate={() => setRotation((r) => (r + 90) % 360)}
                  onFlipHorizontal={() => setFlipH(!flipH)}
                  onFlipVertical={() => setFlipV(!flipV)}
                  showGrid={showGrid}
                  onToggleGrid={() => setShowGrid((g) => !g)}
                  onInsertImage={handleInsertImage}
                  isCompositionOpen={isCompositionOpen}
                  onToggleComposition={() => setIsCompositionOpen(!isCompositionOpen)}
                  onOpenOcr={() => setIsOcrOpen(true)}
                  onCopyResult={handleCopyCanvasResult}
                  onExport={() => setIsExportOpen(true)}
                />

                <ToolProperties
                  currentTool={currentTool}
                  selectedColor={selectedColor}
                  onChangeColor={setSelectedColor}
                  strokeWidth={strokeWidth}
                  onChangeStrokeWidth={setStrokeWidth}
                  fontSize={fontSize}
                  onChangeFontSize={setFontSize}
                  fontFamily={fontFamily}
                  onChangeFontFamily={setFontFamily}
                  fontWeight={fontWeight}
                  onChangeFontWeight={setFontWeight}
                  hasBackground={hasBackground}
                  onChangeHasBackground={setHasBackground}
                  redactionStyle={redactionStyle}
                  onChangeRedactionStyle={setRedactionStyle}
                  stampType={stampType}
                  onChangeStampType={setStampType}
                  magnification={magnification}
                  onChangeMagnification={setMagnification}
                  hasSelectedAnnotation={!!selectedAnnotationId}
                  onDeleteSelectedAnnotation={handleDeleteSelected}
                />

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                  <EditorCanvas
                    baseImage={baseImage}
                    annotations={annotations}
                    onUpdateAnnotations={handleUpdateAnnotations}
                    currentTool={currentTool}
                    selectedColor={selectedColor}
                    strokeWidth={strokeWidth}
                    fontSize={fontSize}
                    fontFamily={fontFamily}
                    fontWeight={fontWeight}
                    hasBackground={hasBackground}
                    redactionStyle={redactionStyle}
                    stampType={stampType}
                    magnification={magnification}
                    composition={composition}
                    rotation={rotation}
                    flipH={flipH}
                    flipV={flipV}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    selectedAnnotationId={selectedAnnotationId}
                    onSelectAnnotation={setSelectedAnnotationId}
                    onShowToast={showToast}
                    exportTriggerRef={exportTriggerRef}
                    showGrid={showGrid}
                  />

                  {isCompositionOpen && (
                    <CompositionStudio
                      settings={composition}
                      onChange={setComposition}
                      onClose={() => setIsCompositionOpen(false)}
                    />
                  )}
                </div>
              </>
            ) : (
              /* High-End Home / Empty State Workspace */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                  padding: '36px 32px',
                  alignItems: 'center',
                  gap: 32
                }}
              >
                {/* Hero Card */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: 720,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 16,
                    padding: '36px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 20,
                    boxShadow: 'var(--shadow-md)',
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%), var(--bg-surface)'
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 18,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    <Camera size={30} color="#ffffff" />
                  </div>

                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
                      Instant Screen Capture & Studio
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 460, lineHeight: 1.5 }}>
                      Press the global shortcut anywhere in Windows, or drop an image below to start annotating with
                      pro tools.
                    </p>
                  </div>

                  {/* Primary CTA buttons */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={handleTakeScreenshot}
                      className="primary"
                      style={{ padding: '10px 22px', fontSize: 13, borderRadius: 8, gap: 8 }}
                    >
                      <Camera size={16} />
                      <span>Take Screenshot</span>
                      <span className="kbd-hint" style={{ color: '#090a0d', background: 'rgba(0,0,0,0.12)', borderColor: 'rgba(0,0,0,0.2)' }}>
                        Ctrl+Shift+S
                      </span>
                    </button>

                    <button
                      onClick={handlePasteClipboard}
                      className="ghost"
                      style={{ padding: '10px 18px', fontSize: 13, borderRadius: 8, gap: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    >
                      <ClipboardPaste size={16} />
                      <span>Paste Image</span>
                      <span className="kbd-hint">Ctrl+V</span>
                    </button>
                  </div>
                </div>

                {/* Specialized Workspaces Quick-Access Grid */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: 720,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12
                  }}
                >
                  {[
                    {
                      id: 'diff',
                      title: 'Visual Diff',
                      desc: 'Pixel difference heatmap, split slider & overlay comparison',
                      icon: <GitCompare size={18} color="#ffffff" />
                    },
                    {
                      id: 'flow',
                      title: 'Flow Guides',
                      desc: 'Step-by-step procedural guides with PDF, HTML & MD export',
                      icon: <BookOpen size={18} color="#cbd5e1" />
                    },
                    {
                      id: 'compose',
                      title: 'Compose Studio',
                      desc: 'Multi-screenshot storyboards, window frames & custom presets',
                      icon: <Sparkles size={18} color="#f8fafc" />
                    }
                  ].map((card) => (
                    <div
                      key={card.id}
                      onClick={() => setActiveTab(card.id as any)}
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 12,
                        padding: 16,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        transition: 'all 0.15s ease',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: 'var(--bg-app)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {card.icon}
                        </div>
                        <ArrowRight size={13} color="var(--text-muted)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {card.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {card.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Keyboard Shortcuts Quick Reference Card */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: 720,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>
                    <Command size={15} color="var(--accent-primary)" />
                    <span>Quick Interaction Cheat Sheet</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                    {[
                      { key: 'Ctrl + Shift + S', label: 'Trigger selection overlay on active monitor' },
                      { key: '↵ Enter', label: 'Quick Copy to clipboard & close overlay' },
                      { key: 'E', label: 'Open crop directly into full editor' },
                      { key: 'S', label: 'Save screenshot file to Pictures folder' },
                      { key: 'P', label: 'Pin screenshot always on top with opacity slider' },
                      { key: 'Esc', label: 'Cancel capture mode without saving' }
                    ].map((item) => (
                      <div
                        key={item.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-app)',
                          borderRadius: 6,
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <span className="kbd-hint" style={{ minWidth: 64, textAlign: 'center', color: 'var(--accent-light)' }}>
                          {item.key}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Captures Strip */}
                {recentCaptures.length > 0 && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 720,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Recent Captures</span>
                      <button onClick={() => setActiveTab('history')} className="ghost" style={{ padding: '3px 8px', fontSize: 11 }}>
                        <span>View All</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 10 }}>
                      {recentCaptures.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setPreviewItem(item)}
                          style={{
                            height: 75,
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'border-color 0.15s ease, transform 0.1s ease'
                          }}
                          title={`Preview & Extract Text (OCR): ${item.fileName}`}
                        >
                          <img
                            src={item.thumbnailUrl || item.dataUrl}
                            alt={item.fileName}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Visual Diff Tab */}
        {activeTab === 'diff' && <DiffView onShowToast={showToast} />}

        {/* Flow Guides Tab */}
        {activeTab === 'flow' && (
          <FlowGuideView onShowToast={showToast} onOpenInEditor={loadImage} />
        )}

        {/* Compose Studio Tab */}
        {activeTab === 'compose' && (
          <ComposeStudioView onShowToast={showToast} onOpenInEditor={loadImage} />
        )}

        {/* History Tab */}
        {activeTab === 'history' && <HistoryView onOpenInEditor={loadImage} />}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsView
            onThemeChange={(th) => {
              document.documentElement.setAttribute('data-theme', th);
            }}
          />
        )}
      </div>

      {/* Export Modal */}
      {isExportOpen && baseImage && exportTriggerRef.current && (
        <ExportModal
          previewDataUrl={exportTriggerRef.current('png', 95)}
          width={baseImage.naturalWidth}
          height={baseImage.naturalHeight}
          onClose={() => setIsExportOpen(false)}
          onSaveToFile={handleSaveExport}
          onCopyToClipboard={handleCopyExport}
        />
      )}

      {/* OCR Modal */}
      {isOcrOpen && rawImageDataUrl && (
        <OcrModal
          imageDataUrl={rawImageDataUrl}
          onClose={() => setIsOcrOpen(false)}
          onExtractedText={() => {
            showToast('OCR Text Extracted successfully');
          }}
        />
      )}

      {/* Screenshot Preview & Direct OCR Modal */}
      {previewItem && (
        <ScreenshotPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onOpenInEditor={(dataUrl) => {
            setPreviewItem(null);
            loadImage(dataUrl);
          }}
          onUpdateOcrText={(id, text) => {
            setRecentCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, ocrText: text } : c)));
            if (previewItem && previewItem.id === id) {
              setPreviewItem((prev) => (prev ? { ...prev, ocrText: text } : null));
            }
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(18, 19, 22, 0.96)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f9fafb',
            padding: '9px 20px',
            borderRadius: 10,
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)',
            fontSize: 12,
            fontWeight: 600,
            zIndex: 999999
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);
