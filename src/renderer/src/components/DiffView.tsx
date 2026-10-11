import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScreenshotHistoryItem } from '@shared/types';
import { compareImageData, DiffResult } from '@shared/pixelDiff';
import {
  GitCompare,
  Sliders,
  Columns,
  Layers,
  Flame,
  ArrowLeftRight,
  Upload,
  Clock,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  AlertCircle
} from 'lucide-react';

interface DiffViewProps {
  onShowToast: (msg: string) => void;
}

type ViewMode = 'side-by-side' | 'slider' | 'overlay' | 'heatmap';
type ScaleMode = 'pad' | 'scale' | 'crop';

export const DiffView: React.FC<DiffViewProps> = ({ onShowToast }) => {
  const [imageA, setImageA] = useState<HTMLImageElement | null>(null);
  const [imageB, setImageB] = useState<HTMLImageElement | null>(null);
  const [imageASrc, setImageASrc] = useState<string | null>(null);
  const [imageBSrc, setImageBSrc] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('slider');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('pad');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0% to 100%
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5); // 0 to 1
  const [threshold, setThreshold] = useState<number>(0.1); // 0.01 to 0.4
  const [highlightColor, setHighlightColor] = useState<'red' | 'magenta' | 'cyan' | 'yellow'>('red');

  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [isProcessingDiff, setIsProcessingDiff] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<'A' | 'B' | null>(null);
  const [historyItems, setHistoryItems] = useState<ScreenshotHistoryItem[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  const updateSliderFromClientX = (clientX: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPosition(pct);
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'slider') return;
    setIsDraggingSlider(true);
    updateSliderFromClientX(e.clientX);
  };

  const handleSliderMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSlider && viewMode === 'slider') {
      updateSliderFromClientX(e.clientX);
    }
  };

  const handleSliderMouseUp = () => {
    setIsDraggingSlider(false);
  };

  // Load history list for modal picker
  useEffect(() => {
    async function load() {
      if (window.snapshotAPI) {
        const list = await window.snapshotAPI.getHistory();
        setHistoryItems(list || []);
      }
    }
    load();
  }, []);

  // Helper to load image from dataUrl or file URL
  const loadImageElement = (src: string, target: 'A' | 'B') => {
    const img = new Image();
    img.onload = () => {
      if (target === 'A') {
        setImageA(img);
        setImageASrc(src);
      } else {
        setImageB(img);
        setImageBSrc(src);
      }
    };
    img.src = src;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'A' | 'B') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          loadImageElement(evt.target.result as string, target);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSwap = () => {
    const prevA = imageA;
    const prevASrc = imageASrc;
    setImageA(imageB);
    setImageASrc(imageBSrc);
    setImageB(prevA);
    setImageBSrc(prevASrc);
  };

  // Compute normalized ImageDatas and run pixel-difference
  const computeDiff = useCallback(() => {
    if (!imageA || !imageB) {
      setDiffResult(null);
      return;
    }

    setIsProcessingDiff(true);

    try {
      // Determine normalized width & height
      let targetW: number;
      let targetH: number;

      if (scaleMode === 'crop') {
        targetW = Math.min(imageA.naturalWidth, imageB.naturalWidth);
        targetH = Math.min(imageA.naturalHeight, imageB.naturalHeight);
      } else {
        targetW = Math.max(imageA.naturalWidth, imageB.naturalWidth);
        targetH = Math.max(imageA.naturalHeight, imageB.naturalHeight);
      }

      // Draw Image A onto normalized canvas
      const canvasA = document.createElement('canvas');
      canvasA.width = targetW;
      canvasA.height = targetH;
      const ctxA = canvasA.getContext('2d')!;
      ctxA.fillStyle = '#101216';
      ctxA.fillRect(0, 0, targetW, targetH);

      if (scaleMode === 'scale') {
        ctxA.drawImage(imageA, 0, 0, targetW, targetH);
      } else {
        // Pad or crop
        ctxA.drawImage(imageA, 0, 0);
      }
      const dataA = ctxA.getImageData(0, 0, targetW, targetH);

      // Draw Image B onto normalized canvas
      const canvasB = document.createElement('canvas');
      canvasB.width = targetW;
      canvasB.height = targetH;
      const ctxB = canvasB.getContext('2d')!;
      ctxB.fillStyle = '#101216';
      ctxB.fillRect(0, 0, targetW, targetH);

      if (scaleMode === 'scale') {
        ctxB.drawImage(imageB, 0, 0, targetW, targetH);
      } else {
        ctxB.drawImage(imageB, 0, 0);
      }
      const dataB = ctxB.getImageData(0, 0, targetW, targetH);

      // Run diff
      const result = compareImageData(dataA, dataB, {
        threshold,
        highlightColor,
        unchangedOpacity: 0.2
      });

      setDiffResult(result);
    } catch (err) {
      console.error('Diff computation error:', err);
    } finally {
      setIsProcessingDiff(false);
    }
  }, [imageA, imageB, scaleMode, threshold, highlightColor]);

  useEffect(() => {
    computeDiff();
  }, [computeDiff]);

  // Main Render to display canvas
  const renderComparisonCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageA || !imageB) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = diffResult?.width || Math.max(imageA.naturalWidth, imageB.naturalWidth);
    const h = diffResult?.height || Math.max(imageA.naturalHeight, imageB.naturalHeight);

    if (viewMode === 'side-by-side') {
      canvas.width = w * 2 + 16;
      canvas.height = h + 36;
      ctx.fillStyle = '#0b0d13';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Labels
      ctx.font = '600 13px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('BEFORE (Image A)', 12, 22);
      ctx.fillText('AFTER (Image B)', w + 28, 22);

      // Image A
      ctx.drawImage(imageA, 12, 30, w, h);
      // Image B
      ctx.drawImage(imageB, w + 28, 30, w, h);
    } else if (viewMode === 'heatmap' && diffResult) {
      canvas.width = w;
      canvas.height = h;
      ctx.putImageData(diffResult.diffImageData, 0, 0);

      // Draw bounding box outlines around changed clusters
      ctx.strokeStyle = highlightColor === 'cyan' ? '#06b6d4' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      diffResult.regions.forEach((r) => {
        ctx.strokeRect(r.minX, r.minY, r.width, r.height);
      });
      ctx.setLineDash([]);
    } else if (viewMode === 'overlay') {
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      // Base Image A
      ctx.globalAlpha = 1.0;
      ctx.drawImage(imageA, 0, 0, w, h);

      // Overlay Image B with opacity
      ctx.globalAlpha = overlayOpacity;
      ctx.drawImage(imageB, 0, 0, w, h);
      ctx.globalAlpha = 1.0;
    } else if (viewMode === 'slider') {
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      // Draw Image B (After) as base
      ctx.drawImage(imageB, 0, 0, w, h);

      // Draw Image A (Before) clipped to slider position
      const splitX = Math.round((sliderPosition / 100) * w);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, h);
      ctx.clip();
      ctx.drawImage(imageA, 0, 0, w, h);
      ctx.restore();

      // Draw divider line
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
      ctx.stroke();

      // Divider handle icon in center
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(splitX, h / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [imageA, imageB, diffResult, viewMode, sliderPosition, overlayOpacity, highlightColor]);

  useEffect(() => {
    renderComparisonCanvas();
  }, [renderComparisonCanvas]);

  // Export functions
  const handleExportDiffImage = async () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (window.snapshotAPI) {
      const res = await window.snapshotAPI.saveImage({ dataUrl, format: 'png' });
      if (res.success) {
        onShowToast('Comparison image saved successfully!');
      } else {
        onShowToast('Export failed: ' + res.error);
      }
    }
  };

  const handleCopyDiffImage = async () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (window.snapshotAPI) {
      await window.snapshotAPI.copyImage(dataUrl);
      onShowToast('Comparison image copied to clipboard!');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-app)' }}>
      {/* Top Diff Action & Configuration Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        {/* Left: Comparison Modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { id: 'slider', label: 'Split Slider', icon: <Sliders size={14} /> },
            { id: 'side-by-side', label: 'Side by Side', icon: <Columns size={14} /> },
            { id: 'overlay', label: 'Opacity Overlay', icon: <Layers size={14} /> },
            { id: 'heatmap', label: 'Diff Heatmap', icon: <Flame size={14} /> }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as ViewMode)}
              className={viewMode === mode.id ? 'primary' : 'ghost'}
              style={{ padding: '6px 10px', fontSize: 12, gap: 6, borderRadius: 6 }}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Center: Contextual Sliders & Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {viewMode === 'slider' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
              <span>Split: {Math.round(sliderPosition)}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                style={{ width: 100, accentColor: 'var(--accent-primary)' }}
              />
            </div>
          )}

          {viewMode === 'overlay' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
              <span>Overlay: {Math.round(overlayOpacity * 100)}%</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                style={{ width: 100, accentColor: 'var(--accent-primary)' }}
              />
            </div>
          )}

          {viewMode === 'heatmap' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Tolerance: {Math.round(threshold * 100)}%</span>
                <input
                  type="range"
                  min="0.02"
                  max="0.3"
                  step="0.02"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  style={{ width: 80, accentColor: 'var(--accent-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Color:</span>
                {(['red', 'magenta', 'cyan', 'yellow'] as const).map((col) => (
                  <div
                    key={col}
                    onClick={() => setHighlightColor(col)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: col === 'red' ? '#ef4444' : col === 'magenta' ? '#d946ef' : col === 'cyan' ? '#06b6d4' : '#eab308',
                      cursor: 'pointer',
                      border: highlightColor === col ? '2px solid #ffffff' : '1px solid transparent'
                    }}
                    title={col}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Scaling / Dimension Normalizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Alignment:</span>
            <select
              value={scaleMode}
              onChange={(e) => setScaleMode(e.target.value as ScaleMode)}
              style={{ fontSize: 11, padding: '3px 6px' }}
            >
              <option value="pad">Fit & Pad Canvas</option>
              <option value="scale">Scale Dimensions</option>
              <option value="crop">Crop Overlap</option>
            </select>
          </div>
        </div>

        {/* Right: Export & Copy Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleCopyDiffImage}
            disabled={!imageA || !imageB}
            className="ghost"
            style={{ padding: '6px 10px', fontSize: 12, gap: 5 }}
            title="Copy comparison image to clipboard"
          >
            <Copy size={13} />
            <span>Copy View</span>
          </button>

          <button
            onClick={handleExportDiffImage}
            disabled={!imageA || !imageB}
            className="primary"
            style={{ padding: '6px 12px', fontSize: 12, gap: 5 }}
            title="Export comparison result image"
          >
            <Download size={13} />
            <span>Export Diff</span>
          </button>
        </div>
      </div>

      {/* Image Slots & Metrics Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 12
        }}
      >
        {/* Slot Selection Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Image A Slot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-light)' }}>BEFORE (A):</span>
            {imageA ? (
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                Loaded ({imageA.naturalWidth}×{imageA.naturalHeight}px)
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Empty</span>
            )}
            <button
              onClick={() => setShowHistoryModal('A')}
              className="ghost"
              style={{ padding: '3px 8px', fontSize: 11, gap: 4 }}
            >
              <Clock size={12} />
              <span>History</span>
            </button>
            <label className="ghost" style={{ padding: '3px 8px', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Upload size={12} />
              <span>File</span>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'A')} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Swap A & B */}
          <button onClick={handleSwap} disabled={!imageA && !imageB} className="ghost" style={{ padding: 4 }} title="Swap Before & After">
            <ArrowLeftRight size={14} />
          </button>

          {/* Image B Slot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>AFTER (B):</span>
            {imageB ? (
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                Loaded ({imageB.naturalWidth}×{imageB.naturalHeight}px)
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Empty</span>
            )}
            <button
              onClick={() => setShowHistoryModal('B')}
              className="ghost"
              style={{ padding: '3px 8px', fontSize: 11, gap: 4 }}
            >
              <Clock size={12} />
              <span>History</span>
            </button>
            <label className="ghost" style={{ padding: '3px 8px', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Upload size={12} />
              <span>File</span>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'B')} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Difference Quantitative Metrics */}
        {diffResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            <span style={{ color: diffResult.changedPixels > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
              Delta: {diffResult.diffPercentage.toFixed(2)}% ({diffResult.changedPixels.toLocaleString()} px)
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Clusters: {diffResult.regions.length}
            </span>
          </div>
        )}
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          backgroundColor: '#07090e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {imageA && imageB ? (
          <div
            onMouseDown={handleSliderMouseDown}
            onMouseMove={handleSliderMouseMove}
            onMouseUp={handleSliderMouseUp}
            onMouseLeave={handleSliderMouseUp}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              boxShadow: 'var(--shadow-lg)',
              cursor: viewMode === 'slider' ? 'ew-resize' : 'default',
              userSelect: 'none'
            }}
          >
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: 'none', maxHeight: 'none' }} />
          </div>
        ) : (
          /* Empty Diff State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              color: 'var(--text-muted)'
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <GitCompare size={30} color="var(--accent-primary)" />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Visual Screenshot Comparison
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400 }}>
                Select a baseline image (Before) and a comparison image (After) from your screenshot history or local disk
                to analyze pixel differences and heatmaps.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowHistoryModal('A')} className="primary" style={{ padding: '8px 16px' }}>
                <Clock size={14} />
                <span>Load Before from History</span>
              </button>
              <button onClick={() => setShowHistoryModal('B')} className="ghost" style={{ padding: '8px 16px' }}>
                <Clock size={14} />
                <span>Load After from History</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Picker Modal */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: 24
          }}
          onClick={() => setShowHistoryModal(null)}
        >
          <div
            style={{
              width: 640,
              maxHeight: '80vh',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                Select Image for {showHistoryModal === 'A' ? 'BEFORE (Image A)' : 'AFTER (Image B)'}
              </span>
              <button onClick={() => setShowHistoryModal(null)} className="ghost" style={{ padding: 4 }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    loadImageElement(item.dataUrl, showHistoryModal);
                    setShowHistoryModal(null);
                  }}
                  style={{
                    height: 100,
                    backgroundColor: '#0a0c10',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  title={item.fileName}
                >
                  <img src={item.thumbnailUrl || item.dataUrl} alt={item.fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
