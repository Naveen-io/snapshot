import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ComposeItem, ComposePreset, ScreenshotHistoryItem, ComposeLayout } from '@shared/types';
import { DEFAULT_COMPOSE_PRESETS, DEFAULT_COMPOSE_CONFIG, GRADIENT_PRESETS, COLOR_SWATCHES } from '@shared/constants';
import { calculateComposeLayout } from '@shared/composeEngine';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Upload,
  Clock,
  Download,
  Sliders,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Frame,
  Check,
  Save,
  Grid,
  Columns,
  Rows,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Camera
} from 'lucide-react';

interface ComposeStudioViewProps {
  onShowToast: (msg: string) => void;
  onOpenInEditor?: (dataUrl: string) => void;
}

export const ComposeStudioView: React.FC<ComposeStudioViewProps> = ({ onShowToast, onOpenInEditor }) => {
  const [items, setItems] = useState<ComposeItem[]>([]);
  const [config, setConfig] = useState<ComposePreset>(DEFAULT_COMPOSE_CONFIG);
  const [presets, setPresets] = useState<ComposePreset[]>(DEFAULT_COMPOSE_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(DEFAULT_COMPOSE_CONFIG.id);

  const [zoom, setZoom] = useState<number>(0.85);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<ScreenshotHistoryItem[]>([]);
  const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState<number>(95);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load custom presets on mount
  useEffect(() => {
    async function loadPresets() {
      if (window.snapshotAPI) {
        const loaded = await window.snapshotAPI.getComposePresets();
        if (loaded && loaded.length > 0) {
          setPresets(loaded);
        }
      }
    }
    loadPresets();
  }, []);

  // Update config helper
  const updateConfig = (partial: Partial<ComposePreset>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  // Preset selection
  const handleSelectPreset = (preset: ComposePreset) => {
    setConfig(preset);
    setSelectedPresetId(preset.id);
    onShowToast(`Applied preset: ${preset.name}`);
  };

  // Save new preset
  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    const newPreset: ComposePreset = {
      ...config,
      id: `custom_${Date.now()}`,
      name: newPresetName.trim()
    };

    if (window.snapshotAPI) {
      const saved = await window.snapshotAPI.saveComposePreset(newPreset);
      setPresets((prev) => [...prev, saved]);
      setSelectedPresetId(saved.id);
      setIsSavingPreset(false);
      setNewPresetName('');
      onShowToast(`Saved custom preset: ${saved.name}`);
    }
  };

  // Add Item
  const handleAddItem = (dataUrl: string, label?: string) => {
    const img = new Image();
    img.onload = () => {
      const newItem: ComposeItem = {
        id: `compose_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        dataUrl,
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 600,
        label: label || `Capture ${items.length + 1}`,
        sublabel: ''
      };
      setItems((prev) => [...prev, newItem]);
      setShowHistoryModal(false);
      onShowToast(`Added image (${newItem.width}x${newItem.height})`);
    };
    img.src = dataUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleAddItem(evt.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenHistoryPicker = async () => {
    if (window.snapshotAPI) {
      const list = await window.snapshotAPI.getHistory();
      setHistoryItems(list || []);
    }
    setShowHistoryModal(true);
  };

  // Reordering
  const handleMoveItem = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    setItems(reordered);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleDuplicateItem = (item: ComposeItem) => {
    const duplicated: ComposeItem = {
      ...item,
      id: `compose_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: `${item.label} (Copy)`
    };
    setItems((prev) => [...prev, duplicated]);
  };

  // --- HTML5 Canvas Composite Renderer ---
  const renderCompositeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (items.length === 0) {
      canvas.width = 800;
      canvas.height = 400;
      ctx.fillStyle = '#0f1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No screenshots added to Compose Studio yet.', canvas.width / 2, canvas.height / 2);
      return;
    }

    const labelHeight = config.showLabels ? 36 : 0;
    const frameHeaderHeight = config.frameType !== 'none' ? 32 : 0;

    const layout = calculateComposeLayout(items, config, labelHeight, frameHeaderHeight);
    canvas.width = layout.totalWidth;
    canvas.height = layout.totalHeight;

    // 1. Render Background
    if (config.backgroundType === 'transparent') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (config.backgroundType === 'solid') {
      ctx.fillStyle = config.backgroundColor || '#111827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Linear gradient
      const angleRad = ((config.gradientAngle || 135) * Math.PI) / 180;
      const x1 = Math.round(canvas.width / 2 - Math.cos(angleRad) * (canvas.width / 2));
      const y1 = Math.round(canvas.height / 2 - Math.sin(angleRad) * (canvas.height / 2));
      const x2 = Math.round(canvas.width / 2 + Math.cos(angleRad) * (canvas.width / 2));
      const y2 = Math.round(canvas.height / 2 + Math.sin(angleRad) * (canvas.height / 2));

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      const stops = config.gradientStops && config.gradientStops.length > 1
        ? config.gradientStops
        : [config.gradientFrom || '#111827', config.gradientTo || '#1f2937'];

      stops.forEach((c, idx) => {
        grad.addColorStop(idx / (stops.length - 1), c);
      });
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Load each image synchronously/asynchronously from cache
    items.forEach((item, idx) => {
      const pos = layout.positions[idx];
      if (!pos) return;

      const img = new Image();
      img.onload = () => {
        const itemX = pos.x;
        const itemY = pos.y;
        const itemW = pos.width;
        const itemH = pos.height;
        const radius = config.borderRadius || 0;

        ctx.save();

        // 2. Drop Shadow
        if (config.shadowBlur > 0) {
          ctx.shadowColor = config.shadowColor || 'rgba(0,0,0,0.45)';
          ctx.shadowBlur = config.shadowBlur;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = config.shadowOffsetY || 8;
        }

        // Card Container Shape
        const totalCardH = itemH + frameHeaderHeight + labelHeight;
        ctx.fillStyle = '#181b24';
        if (radius > 0) {
          ctx.beginPath();
          ctx.roundRect(itemX, itemY, itemW, totalCardH, radius);
          ctx.fill();
        } else {
          ctx.fillRect(itemX, itemY, itemW, totalCardH);
        }

        ctx.restore(); // Restore shadow context

        // 3. Render Window Frame Header if active
        if (config.frameType !== 'none') {
          ctx.save();
          ctx.fillStyle = '#20242f';
          if (radius > 0) {
            ctx.beginPath();
            ctx.roundRect(itemX, itemY, itemW, frameHeaderHeight, [radius, radius, 0, 0]);
            ctx.fill();
          } else {
            ctx.fillRect(itemX, itemY, itemW, frameHeaderHeight);
          }

          if (config.frameType === 'macos') {
            // Three macOS dots
            const dotY = itemY + frameHeaderHeight / 2;
            const dots = ['#ff5f56', '#ffbd2e', '#27c93f'];
            dots.forEach((color, dIdx) => {
              ctx.beginPath();
              ctx.arc(itemX + 16 + dIdx * 18, dotY, 5, 0, Math.PI * 2);
              ctx.fillStyle = color;
              ctx.fill();
            });
          } else {
            // Windows 11 style min/max/close controls on right
            const btnW = 20;
            const btnH = 14;
            const rightEdge = itemX + itemW - 14;
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 1.2;

            // Close 'X'
            ctx.beginPath();
            ctx.moveTo(rightEdge - 8, itemY + 11);
            ctx.lineTo(rightEdge, itemY + 19);
            ctx.moveTo(rightEdge, itemY + 11);
            ctx.lineTo(rightEdge - 8, itemY + 19);
            ctx.stroke();

            // Maximize square
            ctx.strokeRect(rightEdge - 28, itemY + 11, 8, 8);

            // Minimize line
            ctx.beginPath();
            ctx.moveTo(rightEdge - 48, itemY + 15);
            ctx.lineTo(rightEdge - 40, itemY + 15);
            ctx.stroke();
          }

          // Header title
          ctx.fillStyle = '#9ca3af';
          ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.label || 'Window Preview', itemX + itemW / 2, itemY + 20);

          ctx.restore();
        }

        // 4. Render Screenshot Image
        ctx.save();
        const imgY = itemY + frameHeaderHeight;
        if (radius > 0 && config.frameType === 'none' && !config.showLabels) {
          ctx.beginPath();
          ctx.roundRect(itemX, imgY, itemW, itemH, radius);
          ctx.clip();
        }
        ctx.drawImage(img, itemX, imgY, itemW, itemH);
        ctx.restore();

        // 5. Render Label & Sublabel Footer if active
        if (config.showLabels) {
          const labelY = imgY + itemH;
          ctx.save();
          ctx.fillStyle = '#181b24';
          if (radius > 0) {
            ctx.beginPath();
            ctx.roundRect(itemX, labelY, itemW, labelHeight, [0, 0, radius, radius]);
            ctx.fill();
          } else {
            ctx.fillRect(itemX, labelY, itemW, labelHeight);
          }

          ctx.fillStyle = '#f3f4f6';
          ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.label || `Capture ${idx + 1}`, itemX + itemW / 2, labelY + 22);

          ctx.restore();
        }

        // 6. Optional Dividers between items
        if (config.showDividers && idx < items.length - 1) {
          ctx.save();
          ctx.strokeStyle = config.dividerColor || '#374151';
          ctx.lineWidth = config.dividerWidth || 1;
          const nextPos = layout.positions[idx + 1];

          if (config.layout === 'horizontal' && nextPos) {
            const divX = Math.round((itemX + itemW + nextPos.x) / 2);
            ctx.beginPath();
            ctx.moveTo(divX, config.padding);
            ctx.lineTo(divX, canvas.height - config.padding);
            ctx.stroke();
          } else if (config.layout === 'vertical' && nextPos) {
            const divY = Math.round((itemY + totalCardH + nextPos.y) / 2);
            ctx.beginPath();
            ctx.moveTo(config.padding, divY);
            ctx.lineTo(canvas.width - config.padding, divY);
            ctx.stroke();
          }
          ctx.restore();
        }
      };
      img.src = item.dataUrl;
    });
  }, [items, config]);

  // Re-render whenever items or config changes
  useEffect(() => {
    renderCompositeCanvas();
  }, [renderCompositeCanvas]);

  // Copy composite to clipboard
  const handleCopyComposite = async () => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (window.snapshotAPI) {
      await window.snapshotAPI.copyImage(dataUrl);
      onShowToast(`Composite (${canvas.width}x${canvas.height}) copied to clipboard`);
    }
  };

  // Save composite to disk
  const handleSaveComposite = async () => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;
    const mime = exportFormat === 'jpeg' ? 'image/jpeg' : exportFormat === 'webp' ? 'image/webp' : 'image/png';
    const dataUrl = canvas.toDataURL(mime, exportQuality / 100);
    if (window.snapshotAPI) {
      const res = await window.snapshotAPI.saveImage({
        dataUrl,
        format: exportFormat,
        quality: exportQuality
      });
      if (res.success) {
        onShowToast(`Composite saved: ${res.filePath}`);
      } else {
        onShowToast(`Failed to save composite: ${res.error}`);
      }
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflow: 'hidden'
      }}
    >
      {/* Top Studio Control Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          flexShrink: 0
        }}
      >
        {/* Left: Studio Identity & Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sparkles size={16} color="var(--accent-primary)" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Compose Studio</span>

              {/* Preset Selector */}
              <select
                value={selectedPresetId}
                onChange={(e) => {
                  const p = presets.find((pr) => pr.id === e.target.value);
                  if (p) handleSelectPreset(p);
                }}
                style={{
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Save Preset trigger */}
              {!isSavingPreset ? (
                <button
                  onClick={() => setIsSavingPreset(true)}
                  className="ghost"
                  style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, gap: 4 }}
                  title="Save current layout as a reusable preset"
                >
                  <Save size={12} />
                  <span>Save Preset</span>
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Preset name..."
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--accent-primary)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 11,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      width: 110
                    }}
                  />
                  <button onClick={handleSavePreset} className="primary" style={{ padding: '3px 6px', fontSize: 11 }}>
                    <Check size={11} />
                  </button>
                  <button onClick={() => setIsSavingPreset(false)} className="ghost" style={{ padding: '3px 6px', fontSize: 11 }}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Layout Mode Quick Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'var(--bg-app)', padding: 3, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'horizontal', label: 'Row', icon: <Columns size={13} /> },
            { id: 'vertical', label: 'Column', icon: <Rows size={13} /> },
            { id: 'grid', label: 'Grid', icon: <Grid size={13} /> }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => updateConfig({ layout: mode.id as ComposeLayout })}
              className={config.layout === mode.id ? 'primary' : 'ghost'}
              style={{ padding: '4px 10px', fontSize: 11, borderRadius: 4, gap: 5 }}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Export composite actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleCopyComposite}
            disabled={items.length === 0}
            className="ghost"
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, gap: 5 }}
            title="Copy high-res composite to clipboard"
          >
            <Copy size={13} />
            <span>Copy Composite</span>
          </button>

          <button
            onClick={handleSaveComposite}
            disabled={items.length === 0}
            className="primary"
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, gap: 6 }}
            title="Export full resolution image to disk"
          >
            <Download size={13} />
            <span>Export Image</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: Canvas & Inspector */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left / Center: Interactive Canvas Canvas Area */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0a0c10',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Zoom and Dimension Floating Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(15, 17, 23, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '4px 10px',
              zIndex: 10,
              fontSize: 11,
              color: 'var(--text-secondary)'
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {canvasRef.current ? `${canvasRef.current.width} × ${canvasRef.current.height} px` : '0 × 0 px'}
            </span>
            <span style={{ color: 'var(--border-subtle)' }}>|</span>
            <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))} className="ghost" style={{ padding: 2 }}>
              <ZoomOut size={13} />
            </button>
            <span style={{ minWidth: 34, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))} className="ghost" style={{ padding: 2 }}>
              <ZoomIn size={13} />
            </button>
            <button onClick={() => setZoom(0.85)} className="ghost" style={{ padding: '2px 6px', fontSize: 10 }}>
              Fit
            </button>
          </div>

          {/* Canvas Scroll Viewport */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40
            }}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease-out',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                borderRadius: config.borderRadius ? 4 : 0
              }}
            >
              <canvas ref={canvasRef} style={{ display: 'block', maxWidth: 'none', maxHeight: 'none' }} />
            </div>
          </div>

          {/* Bottom Item Strip */}
          <div
            style={{
              height: 110,
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              gap: 12,
              overflowX: 'auto',
              flexShrink: 0
            }}
          >
            {/* Add Screenshot Buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleOpenHistoryPicker}
                className="ghost"
                style={{
                  height: 80,
                  width: 80,
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 10,
                  padding: 4
                }}
                title="Pick screenshot from local history"
              >
                <Clock size={16} color="var(--accent-primary)" />
                <span>History</span>
              </button>

              <label
                className="ghost"
                style={{
                  height: 80,
                  width: 80,
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 10,
                  padding: 4,
                  cursor: 'pointer'
                }}
                title="Import screenshot from file"
              >
                <Upload size={16} color="var(--accent-primary)" />
                <span>Import</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Current Items List */}
            {items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  height: 86,
                  width: 120,
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  flexShrink: 0,
                  position: 'relative'
                }}
              >
                {/* Thumbnail Image */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2, background: '#090d16' }}>
                  <img src={item.dataUrl} alt={item.label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>

                {/* Inline Label & Reorder Bar */}
                <div
                  style={{
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderTop: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      onClick={() => handleMoveItem(idx, 'left')}
                      disabled={idx === 0}
                      className="ghost"
                      style={{ padding: '2px 3px', opacity: idx === 0 ? 0.3 : 1 }}
                      title="Move Left"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button
                      onClick={() => handleMoveItem(idx, 'right')}
                      disabled={idx === items.length - 1}
                      className="ghost"
                      style={{ padding: '2px 3px', opacity: idx === items.length - 1 ? 0.3 : 1 }}
                      title="Move Right"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="ghost"
                    style={{ padding: '2px 3px', color: '#ef4444' }}
                    title="Remove Image"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Composition Customizer */}
        <div
          style={{
            width: 310,
            backgroundColor: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 16,
            gap: 18,
            fontSize: 12,
            flexShrink: 0
          }}
        >
          {/* Layout Controls */}
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 10, color: 'var(--text-primary)' }}>
              Layout & Spacing
            </span>

            {/* Gap Spacing Slider */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Item Gap</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{config.spacing}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="64"
                step="4"
                value={config.spacing}
                onChange={(e) => updateConfig({ spacing: parseInt(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            {/* Outer Padding Slider */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Canvas Padding</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{config.padding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="96"
                step="8"
                value={config.padding}
                onChange={(e) => updateConfig({ padding: parseInt(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            {/* Alignment */}
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cross-Axis Alignment</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                {(['start', 'center', 'end'] as const).map((al) => (
                  <button
                    key={al}
                    onClick={() => updateConfig({ alignment: al })}
                    className={config.alignment === al ? 'primary' : 'ghost'}
                    style={{ padding: '5px 4px', fontSize: 11, textTransform: 'capitalize' }}
                  >
                    {al}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />

          {/* Frames & Mockups */}
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 10, color: 'var(--text-primary)' }}>
              Window Frames
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 12 }}>
              {[
                { id: 'none', label: 'None' },
                { id: 'windows', label: 'Windows 11' },
                { id: 'macos', label: 'macOS' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => updateConfig({ frameType: f.id as any })}
                  className={config.frameType === f.id ? 'primary' : 'ghost'}
                  style={{ padding: '6px 4px', fontSize: 11 }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Corner Radius */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Corner Radius</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{config.borderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="2"
                value={config.borderRadius}
                onChange={(e) => updateConfig({ borderRadius: parseInt(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            {/* Shadow Blur */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Drop Shadow Blur</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{config.shadowBlur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                step="4"
                value={config.shadowBlur}
                onChange={(e) => updateConfig({ shadowBlur: parseInt(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />

          {/* Dividers & Labels */}
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 10, color: 'var(--text-primary)' }}>
              Labels & Dividers
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.showLabels}
                  onChange={(e) => updateConfig({ showLabels: e.target.checked })}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                <span>Show Image Titles / Labels</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.showDividers}
                  onChange={(e) => updateConfig({ showDividers: e.target.checked })}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                <span>Render Dividers Between Images</span>
              </label>
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />

          {/* Background Styling */}
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 10, color: 'var(--text-primary)' }}>
              Background Backdrop
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 12 }}>
              {(['gradient', 'solid', 'transparent'] as const).map((bg) => (
                <button
                  key={bg}
                  onClick={() => updateConfig({ backgroundType: bg })}
                  className={config.backgroundType === bg ? 'primary' : 'ghost'}
                  style={{ padding: '6px 4px', fontSize: 11, textTransform: 'capitalize' }}
                >
                  {bg}
                </button>
              ))}
            </div>

            {config.backgroundType === 'gradient' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {GRADIENT_PRESETS.slice(0, 8).map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() =>
                      updateConfig({
                        gradientPresetId: preset.id,
                        gradientStops: preset.colors,
                        gradientFrom: preset.colors[0],
                        gradientTo: preset.colors[preset.colors.length - 1],
                        gradientAngle: preset.angle
                      })
                    }
                    style={{
                      height: 36,
                      borderRadius: 6,
                      background: `linear-gradient(${preset.angle}deg, ${preset.colors.join(', ')})`,
                      cursor: 'pointer',
                      border: config.gradientPresetId === preset.id ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 4
                    }}
                  >
                    <span style={{ fontSize: 9, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.8)', fontWeight: 600 }}>
                      {preset.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {config.backgroundType === 'solid' && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['#090d16', '#111827', '#1f2937', '#0f172a', '#1e1b4b', '#022c22', '#ffffff'].map((color) => (
                  <div
                    key={color}
                    onClick={() => updateConfig({ backgroundColor: color })}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: config.backgroundColor === color ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Picker Modal */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{
              width: 680,
              maxHeight: '80vh',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Add Screenshot to Compose Studio</span>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="ghost" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 12
              }}
            >
              {historyItems.length > 0 ? (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleAddItem(item.dataUrl, item.fileName)}
                    style={{
                      height: 100,
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer'
                    }}
                    title={`Add ${item.fileName}`}
                  >
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                      <img
                        src={item.thumbnailUrl || item.dataUrl}
                        alt={item.fileName}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div
                      style={{
                        padding: '4px 6px',
                        fontSize: 10,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.fileName}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  No screenshots recorded in local history yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
