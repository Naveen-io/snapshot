import React, { useRef } from 'react';
import {
  MousePointer,
  ArrowRight,
  Minus,
  Square,
  Circle,
  PenTool,
  Highlighter,
  Type,
  MessageSquare,
  ListOrdered,
  Stamp,
  Search,
  ShieldAlert,
  SunMedium,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Download,
  Palette,
  FileText,
  Pipette,
  Grid,
  ImagePlus
} from 'lucide-react';
import { ToolType } from '@shared/types';

interface EditorToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onRotate: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onInsertImage: (dataUrl: string) => void;
  isCompositionOpen: boolean;
  onToggleComposition: () => void;
  onOpenOcr: () => void;
  onCopyResult: () => void;
  onExport: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  currentTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onRotate,
  onFlipHorizontal,
  onFlipVertical,
  showGrid,
  onToggleGrid,
  onInsertImage,
  isCompositionOpen,
  onToggleComposition,
  onOpenOcr,
  onCopyResult,
  onExport
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onInsertImage(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  // Group 1: Navigation & Transformation
  const transformTools = [
    { id: 'select' as ToolType, icon: <MousePointer size={14} />, label: 'Select & Move (V)' }
  ];

  // Group 2: Vector Shapes & Freehand
  const shapeTools = [
    { id: 'arrow' as ToolType, icon: <ArrowRight size={14} />, label: 'Arrow (A)' },
    { id: 'line' as ToolType, icon: <Minus size={14} />, label: 'Line (L)' },
    { id: 'rect' as ToolType, icon: <Square size={14} />, label: 'Rectangle (R)' },
    { id: 'rounded-rect' as ToolType, icon: <Square size={14} style={{ borderRadius: 3 }} />, label: 'Rounded Rectangle' },
    { id: 'ellipse' as ToolType, icon: <Circle size={14} />, label: 'Ellipse (O)' },
    { id: 'pen' as ToolType, icon: <PenTool size={14} />, label: 'Pen Draw (P)' },
    { id: 'highlighter' as ToolType, icon: <Highlighter size={14} />, label: 'Highlighter (H)' }
  ];

  // Group 3: Text & Callouts
  const textTools = [
    { id: 'text' as ToolType, icon: <Type size={14} />, label: 'Text (T)' },
    { id: 'callout' as ToolType, icon: <MessageSquare size={14} />, label: 'Speech Bubble Callout' },
    { id: 'step' as ToolType, icon: <ListOrdered size={14} />, label: 'Numbered Steps' }
  ];

  // Group 4: Privacy & Focus
  const focusTools = [
    { id: 'redact' as ToolType, icon: <ShieldAlert size={14} />, label: 'Redact & Blur' },
    { id: 'spotlight' as ToolType, icon: <SunMedium size={14} />, label: 'Spotlight Focus' },
    { id: 'loupe-annotation' as ToolType, icon: <Search size={14} />, label: 'Magnifier Zoom' },
    { id: 'color-picker' as ToolType, icon: <Pipette size={14} />, label: 'Color Picker (Eyedropper)' },
    { id: 'stamp' as ToolType, icon: <Stamp size={14} />, label: 'Stamp Badges' }
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 12px',
        backgroundColor: 'rgba(18, 19, 22, 0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        gap: 8,
        flexShrink: 0,
        overflowX: 'auto',
        userSelect: 'none'
      }}
    >
      {/* LEFT: APPLE SEGMENTED TOOLBAR CLUSTERS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Transform Segment */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '2px'
          }}
        >
          {transformTools.map((t) => {
            const isActive = currentTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTool(t.id)}
                className="ghost"
                title={t.label}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease'
                }}
              >
                {t.icon}
              </button>
            );
          })}
        </div>

        {/* Shapes & Pen Segment */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '2px',
            gap: 1
          }}
        >
          {shapeTools.map((t) => {
            const isActive = currentTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTool(t.id)}
                className="ghost"
                title={t.label}
                style={{
                  padding: '5px 7px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease'
                }}
              >
                {t.icon}
              </button>
            );
          })}
        </div>

        {/* Text & Callouts Segment */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '2px',
            gap: 1
          }}
        >
          {textTools.map((t) => {
            const isActive = currentTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTool(t.id)}
                className="ghost"
                title={t.label}
                style={{
                  padding: '5px 7px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease'
                }}
              >
                {t.icon}
              </button>
            );
          })}
        </div>

        {/* Privacy & Focus Segment */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '2px',
            gap: 1
          }}
        >
          {focusTools.map((t) => {
            const isActive = currentTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTool(t.id)}
                className="ghost"
                title={t.label}
                style={{
                  padding: '5px 7px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease'
                }}
              >
                {t.icon}
              </button>
            );
          })}
        </div>

        {/* Rotate, Flips & Stickers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '2px',
            gap: 1
          }}
        >
          <button
            type="button"
            onClick={onRotate}
            className="ghost"
            title="Rotate 90° Clockwise"
            style={{ padding: '5px 7px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.65)', border: 'none', cursor: 'pointer' }}
          >
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            onClick={onFlipHorizontal}
            className="ghost"
            title="Flip Horizontal"
            style={{ padding: '5px 7px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.65)', border: 'none', cursor: 'pointer' }}
          >
            <FlipHorizontal size={14} />
          </button>
          <button
            type="button"
            onClick={onFlipVertical}
            className="ghost"
            title="Flip Vertical"
            style={{ padding: '5px 7px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.65)', border: 'none', cursor: 'pointer' }}
          >
            <FlipVertical size={14} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ghost"
            title="Insert Image Sticker"
            style={{ padding: '5px 7px', borderRadius: '6px', color: 'rgba(255, 255, 255, 0.65)', border: 'none', cursor: 'pointer' }}
          >
            <ImagePlus size={14} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* CENTER: UNDO/REDO & ZOOM CAPSULE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Undo / Redo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '2px',
            gap: 1
          }}
        >
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="ghost"
            title="Undo (Ctrl+Z)"
            style={{
              padding: '5px 7px',
              borderRadius: '6px',
              color: canUndo ? '#f3f4f6' : 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              cursor: canUndo ? 'pointer' : 'not-allowed'
            }}
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="ghost"
            title="Redo (Ctrl+Y)"
            style={{
              padding: '5px 7px',
              borderRadius: '6px',
              color: canRedo ? '#f3f4f6' : 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              cursor: canRedo ? 'pointer' : 'not-allowed'
            }}
          >
            <Redo2 size={14} />
          </button>
        </div>

        {/* Zoom & Alignment Grid */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '2px 4px',
            gap: 2
          }}
        >
          <button
            type="button"
            onClick={onZoomOut}
            className="ghost"
            title="Zoom Out (-)"
            style={{ padding: '4px 6px', borderRadius: '5px', color: 'rgba(255, 255, 255, 0.7)', border: 'none', cursor: 'pointer' }}
          >
            <ZoomOut size={13} />
          </button>

          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: '#d1d5db',
              minWidth: 38,
              textAlign: 'center',
              fontWeight: 500
            }}
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={onZoomIn}
            className="ghost"
            title="Zoom In (+)"
            style={{ padding: '4px 6px', borderRadius: '5px', color: 'rgba(255, 255, 255, 0.7)', border: 'none', cursor: 'pointer' }}
          >
            <ZoomIn size={13} />
          </button>

          <button
            type="button"
            onClick={onZoomFit}
            className="ghost"
            title="Fit to Screen"
            style={{ padding: '4px 6px', borderRadius: '5px', color: 'rgba(255, 255, 255, 0.7)', border: 'none', cursor: 'pointer' }}
          >
            <Maximize2 size={13} />
          </button>

          <div style={{ width: 1, height: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 2px' }} />

          <button
            type="button"
            onClick={onToggleGrid}
            className="ghost"
            title="Toggle Alignment Grid (#)"
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              backgroundColor: showGrid ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: showGrid ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Grid size={13} />
          </button>
        </div>
      </div>

      {/* RIGHT: STYLE STUDIO, OCR, COPY & EXPORT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Style & Frame Studio */}
        <button
          type="button"
          onClick={onToggleComposition}
          className="ghost"
          title="Composition Studio (Background, Framing, Shadows)"
          style={{
            padding: '5px 10px',
            fontSize: '12px',
            borderRadius: '7px',
            backgroundColor: isCompositionOpen ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.05)',
            color: isCompositionOpen ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <Palette size={13} />
          <span>Style & Frame</span>
        </button>

        {/* OCR Button */}
        <button
          type="button"
          onClick={onOpenOcr}
          className="ghost"
          title="Extract Text with Local OCR"
          style={{
            padding: '5px 9px',
            fontSize: '12px',
            borderRadius: '7px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <FileText size={13} />
          <span>OCR</span>
        </button>

        <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 2px' }} />

        {/* Copy to Clipboard */}
        <button
          type="button"
          onClick={onCopyResult}
          className="ghost"
          title="Copy Image to Clipboard (Ctrl+C)"
          style={{
            padding: '5px 11px',
            fontSize: '12px',
            borderRadius: '7px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: '#f9fafb',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <Copy size={13} />
          <span>Copy</span>
        </button>

        {/* Primary Export Button */}
        <button
          type="button"
          onClick={onExport}
          className="primary"
          title="Export Image (Ctrl+S)"
          style={{
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '7px',
            backgroundColor: '#ffffff',
            color: '#0c0d10',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
          }}
        >
          <Download size={13} />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};

