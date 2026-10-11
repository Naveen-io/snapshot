import React, { useState, useEffect } from 'react';
import { Guide, GuideStep, ScreenshotHistoryItem } from '@shared/types';
import { reorderSteps, generateFlowMarkdown, generateFlowHtml } from '@shared/flowExport';
import {
  BookOpen,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Upload,
  Clock,
  Download,
  FileCode,
  FileText,
  Printer,
  Edit3,
  Check,
  AlertCircle,
  ExternalLink,
  Camera,
  Layers,
  Sparkles
} from 'lucide-react';

interface FlowGuideViewProps {
  onShowToast: (msg: string) => void;
  onOpenInEditor?: (dataUrl: string) => void;
}

const BADGE_COLORS = [
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ef4444'  // Rose
];

export const FlowGuideView: React.FC<FlowGuideViewProps> = ({ onShowToast, onOpenInEditor }) => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // History modal for picking screenshots
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<ScreenshotHistoryItem[]>([]);
  const [replaceStepId, setReplaceStepId] = useState<string | null>(null);

  // Drag and drop step reordering state
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);

  // Load guides from local storage on mount
  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    if (!window.snapshotAPI) return;
    try {
      setIsLoading(true);
      const list = await window.snapshotAPI.getGuides();
      if (list && list.length > 0) {
        setGuides(list);
        if (!activeGuideId || !list.some((g) => g.id === activeGuideId)) {
          setActiveGuideId(list[0].id);
        }
      } else {
        // Create an initial sample guide
        const initialGuide: Guide = {
          id: `guide_${Date.now()}`,
          title: 'Windows 11 Setup Guide',
          description: 'A step-by-step visual instruction guide captured with SNAPSHOT.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          steps: []
        };
        const saved = await window.snapshotAPI.saveGuide(initialGuide);
        setGuides([saved]);
        setActiveGuideId(saved.id);
      }
    } catch (err) {
      console.error('Failed to load guides:', err);
      onShowToast('Failed to load guides storage');
    } finally {
      setIsLoading(false);
    }
  };

  const activeGuide = guides.find((g) => g.id === activeGuideId) || guides[0] || null;

  // Persist guide changes
  const saveActiveGuide = async (updated: Guide) => {
    setGuides((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    if (window.snapshotAPI) {
      await window.snapshotAPI.saveGuide(updated);
    }
  };

  // Create new guide
  const handleCreateNewGuide = async () => {
    const newGuide: Guide = {
      id: `guide_${Date.now()}`,
      title: `Guide ${guides.length + 1}`,
      description: 'Document procedural steps with crisp annotated screenshots.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: []
    };
    if (window.snapshotAPI) {
      const saved = await window.snapshotAPI.saveGuide(newGuide);
      setGuides((prev) => [saved, ...prev]);
      setActiveGuideId(saved.id);
      onShowToast('Created new Flow Guide');
    }
  };

  // Delete active guide
  const handleDeleteGuide = async () => {
    if (!activeGuide) return;
    if (guides.length <= 1) {
      onShowToast('Cannot delete the only remaining guide');
      return;
    }
    if (confirm(`Are you sure you want to delete "${activeGuide.title}"?`)) {
      if (window.snapshotAPI) {
        await window.snapshotAPI.deleteGuide(activeGuide.id);
        const remaining = guides.filter((g) => g.id !== activeGuide.id);
        setGuides(remaining);
        setActiveGuideId(remaining[0].id);
        onShowToast('Guide deleted');
      }
    }
  };

  // Step Operations
  const handleAddStepWithImage = (imageDataUrl: string, caption?: string) => {
    if (!activeGuide) return;

    if (replaceStepId) {
      // Replace existing step's screenshot
      const updatedSteps = activeGuide.steps.map((s) =>
        s.id === replaceStepId ? { ...s, imageDataUrl, caption: caption || s.caption } : s
      );
      saveActiveGuide({ ...activeGuide, steps: updatedSteps });
      setReplaceStepId(null);
      setShowHistoryModal(false);
      onShowToast('Step screenshot replaced');
      return;
    }

    const stepNum = activeGuide.steps.length + 1;
    const newStep: GuideStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      stepNumber: stepNum,
      title: `Step ${stepNum}`,
      description: '',
      imageDataUrl,
      caption: caption || '',
      badgeColor: BADGE_COLORS[(stepNum - 1) % BADGE_COLORS.length]
    };

    const updatedSteps = [...activeGuide.steps, newStep];
    saveActiveGuide({ ...activeGuide, steps: updatedSteps });
    setShowHistoryModal(false);
    onShowToast(`Added Step ${stepNum}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleAddStepWithImage(evt.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenHistoryPicker = async (stepIdToReplace?: string) => {
    if (window.snapshotAPI) {
      const items = await window.snapshotAPI.getHistory();
      setHistoryItems(items || []);
    }
    setReplaceStepId(stepIdToReplace || null);
    setShowHistoryModal(true);
  };

  const handleUpdateStep = (stepId: string, partial: Partial<GuideStep>) => {
    if (!activeGuide) return;
    const updatedSteps = activeGuide.steps.map((s) => (s.id === stepId ? { ...s, ...partial } : s));
    saveActiveGuide({ ...activeGuide, steps: updatedSteps });
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    if (!activeGuide) return;
    const reordered = reorderSteps(activeGuide.steps, fromIndex, toIndex);
    saveActiveGuide({ ...activeGuide, steps: reordered });
  };

  const handleDuplicateStep = (index: number) => {
    if (!activeGuide) return;
    const step = activeGuide.steps[index];
    const duplicated: GuideStep = {
      ...step,
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${step.title} (Copy)`
    };
    const newSteps = [...activeGuide.steps];
    newSteps.splice(index + 1, 0, duplicated);
    const reindexed = reorderSteps(newSteps, 0, 0); // Re-index stepNumbers
    saveActiveGuide({ ...activeGuide, steps: reindexed });
    onShowToast('Step duplicated');
  };

  const handleDeleteStep = (stepId: string) => {
    if (!activeGuide) return;
    const filtered = activeGuide.steps.filter((s) => s.id !== stepId);
    const reindexed = filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    saveActiveGuide({ ...activeGuide, steps: reindexed });
    onShowToast('Step removed');
  };

  // Exporters
  const handleExportPdf = async () => {
    if (!activeGuide) return;
    if (activeGuide.steps.length === 0) {
      onShowToast('Add at least one step before exporting');
      return;
    }
    try {
      setIsExporting(true);
      const html = generateFlowHtml(activeGuide);
      const defaultName = `${activeGuide.title.replace(/[^a-z0-9_-]/gi, '_')}.pdf`;
      const res = await window.snapshotAPI.exportFlowPdf({ html, defaultName });
      if (res.success) {
        onShowToast(`PDF Guide saved: ${res.filePath}`);
      } else if (res.error && res.error !== 'Cancelled by user') {
        onShowToast(`Export error: ${res.error}`);
      }
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      onShowToast('PDF generation failed: ' + err?.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHtml = async () => {
    if (!activeGuide) return;
    try {
      setIsExporting(true);
      const html = generateFlowHtml(activeGuide);
      const defaultName = `${activeGuide.title.replace(/[^a-z0-9_-]/gi, '_')}.html`;
      const res = await window.snapshotAPI.exportFlowHtml({ html, defaultName });
      if (res.success) {
        onShowToast(`Standalone HTML saved: ${res.filePath}`);
      } else if (res.error && res.error !== 'Cancelled by user') {
        onShowToast(`Export error: ${res.error}`);
      }
    } catch (err: any) {
      console.error('Failed to export HTML:', err);
      onShowToast('HTML generation failed: ' + err?.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    if (!activeGuide) return;
    try {
      setIsExporting(true);
      const markdown = generateFlowMarkdown(activeGuide);
      const defaultName = `${activeGuide.title.replace(/[^a-z0-9_-]/gi, '_')}.md`;
      const res = await window.snapshotAPI.exportFlowMarkdown({ markdown, defaultName });
      if (res.success) {
        onShowToast(`Markdown saved: ${res.filePath}`);
      } else if (res.error && res.error !== 'Cancelled by user') {
        onShowToast(`Export error: ${res.error}`);
      }
    } catch (err: any) {
      console.error('Failed to export Markdown:', err);
      onShowToast('Markdown export failed: ' + err?.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!activeGuide) return;
    const md = generateFlowMarkdown(activeGuide);
    if (window.snapshotAPI) {
      await window.snapshotAPI.copyText(md);
      onShowToast('Markdown copied to clipboard');
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
      {/* Top Header / Guide Switcher & Export Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          flexShrink: 0
        }}
      >
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
            <BookOpen size={16} color="var(--accent-primary)" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={activeGuideId || ''}
                onChange={(e) => setActiveGuideId(e.target.value)}
                style={{
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontWeight: 600,
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {guides.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.steps.length} steps)
                  </option>
                ))}
              </select>

              <button
                onClick={handleCreateNewGuide}
                className="ghost"
                style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, gap: 4 }}
                title="Create New Flow Guide"
              >
                <Plus size={13} />
                <span>New Guide</span>
              </button>

              <button
                onClick={handleDeleteGuide}
                className="ghost"
                style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, color: '#ef4444' }}
                title="Delete Active Guide"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleCopyMarkdown}
            className="ghost"
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, gap: 5 }}
            title="Copy Markdown Document to Clipboard"
          >
            <Copy size={13} />
            <span>Copy MD</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            disabled={isExporting}
            className="ghost"
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, gap: 5 }}
            title="Save as Markdown File (.md)"
          >
            <FileCode size={13} />
            <span>Export MD</span>
          </button>

          <button
            onClick={handleExportHtml}
            disabled={isExporting}
            className="ghost"
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, gap: 5 }}
            title="Save Standalone Offline HTML Guide"
          >
            <FileText size={13} />
            <span>Export HTML</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="primary"
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, gap: 6 }}
            title="Generate Vector PDF Document via Chromium"
          >
            <Printer size={13} />
            <span>{isExporting ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Guide Content Body */}
      {activeGuide ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '24px 32px',
            alignItems: 'center'
          }}
        >
          <div style={{ width: '100%', maxWidth: 840, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Guide Title & Description Editor Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Guide Title
                </span>
                <input
                  type="text"
                  value={activeGuide.title}
                  onChange={(e) => saveActiveGuide({ ...activeGuide, title: e.target.value })}
                  placeholder="e.g. How to Connect Dual Displays on Windows 11"
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    padding: '6px 0',
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    marginTop: 4
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Overview Description
                </span>
                <textarea
                  rows={2}
                  value={activeGuide.description || ''}
                  onChange={(e) => saveActiveGuide({ ...activeGuide, description: e.target.value })}
                  placeholder="Provide brief context for the reader..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    outline: 'none',
                    resize: 'vertical',
                    marginTop: 4
                  }}
                />
              </div>
            </div>

            {/* Steps Count & Add Buttons Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Procedural Steps</span>
                <span
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: '1px 8px',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontWeight: 600
                  }}
                >
                  {activeGuide.steps.length} {activeGuide.steps.length === 1 ? 'Step' : 'Steps'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => handleOpenHistoryPicker()}
                  className="ghost"
                  style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, gap: 5 }}
                >
                  <Clock size={13} />
                  <span>Add from History</span>
                </button>

                <label
                  className="ghost"
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 6,
                    gap: 5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Upload size={13} />
                  <span>Import Image</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>

                <button
                  onClick={() => window.snapshotAPI?.startCapture()}
                  className="primary"
                  style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, gap: 5 }}
                >
                  <Camera size={13} />
                  <span>Capture Step</span>
                </button>
              </div>
            </div>

            {/* Steps List */}
            {activeGuide.steps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {activeGuide.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    draggable
                    onDragStart={() => setDraggedStepIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedStepIndex !== null && draggedStepIndex !== idx) {
                        handleMoveStep(draggedStepIndex, idx);
                        setDraggedStepIndex(null);
                      }
                    }}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Step Card Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        {/* Numbered Badge with Color Picker */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: step.badgeColor || '#06b6d4',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 14,
                              flexShrink: 0
                            }}
                          >
                            {step.stepNumber}
                          </div>

                          {/* Mini Badge Color Swatches */}
                          <div style={{ display: 'flex', gap: 3 }}>
                            {BADGE_COLORS.map((c) => (
                              <div
                                key={c}
                                onClick={() => handleUpdateStep(step.id, { badgeColor: c })}
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  backgroundColor: c,
                                  cursor: 'pointer',
                                  border: step.badgeColor === c ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)'
                                }}
                                title={`Set badge color to ${c}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Step Title Input */}
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => handleUpdateStep(step.id, { title: e.target.value })}
                          placeholder={`Step ${step.stepNumber} title`}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--border-subtle)',
                            padding: '4px 6px',
                            fontWeight: 700,
                            fontSize: 15,
                            color: 'var(--text-primary)',
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Reorder & Action Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => handleMoveStep(idx, idx - 1)}
                          disabled={idx === 0}
                          className="ghost"
                          style={{ padding: '4px 6px', opacity: idx === 0 ? 0.3 : 1 }}
                          title="Move Step Up"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          onClick={() => handleMoveStep(idx, idx + 1)}
                          disabled={idx === activeGuide.steps.length - 1}
                          className="ghost"
                          style={{ padding: '4px 6px', opacity: idx === activeGuide.steps.length - 1 ? 0.3 : 1 }}
                          title="Move Step Down"
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          onClick={() => handleDuplicateStep(idx)}
                          className="ghost"
                          style={{ padding: '4px 6px' }}
                          title="Duplicate Step"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="ghost"
                          style={{ padding: '4px 6px', color: '#ef4444' }}
                          title="Delete Step"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Step Description Input */}
                    <div>
                      <textarea
                        rows={2}
                        value={step.description}
                        onChange={(e) => handleUpdateStep(step.id, { description: e.target.value })}
                        placeholder="Explain what the user needs to do in this step..."
                        style={{
                          width: '100%',
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          outline: 'none',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Screenshot Preview & Controls */}
                    {step.imageDataUrl ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 8,
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            borderBottom: '1px solid var(--border-subtle)',
                            fontSize: 11
                          }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>Captured Screenshot</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {onOpenInEditor && (
                              <button
                                onClick={() => onOpenInEditor(step.imageDataUrl)}
                                className="ghost"
                                style={{ padding: '2px 8px', fontSize: 11, gap: 4 }}
                                title="Open this screenshot in SNAPSHOT Editor"
                              >
                                <Edit3 size={11} />
                                <span>Annotate in Editor</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenHistoryPicker(step.id)}
                              className="ghost"
                              style={{ padding: '2px 8px', fontSize: 11, gap: 4 }}
                              title="Replace with another screenshot"
                            >
                              <Upload size={11} />
                              <span>Replace</span>
                            </button>
                          </div>
                        </div>

                        <div
                          style={{
                            padding: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#090d16'
                          }}
                        >
                          <img
                            src={step.imageDataUrl}
                            alt={step.title}
                            style={{
                              maxWidth: '100%',
                              maxHeight: 360,
                              borderRadius: 6,
                              objectFit: 'contain'
                            }}
                          />
                        </div>

                        {/* Optional Caption Input */}
                        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)' }}>
                          <input
                            type="text"
                            value={step.caption || ''}
                            onChange={(e) => handleUpdateStep(step.id, { caption: e.target.value })}
                            placeholder="Optional screenshot caption (e.g., Click the highlighted checkbox)..."
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleOpenHistoryPicker(step.id)}
                        style={{
                          height: 90,
                          border: '2px dashed var(--border-subtle)',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          color: 'var(--text-muted)',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        <Upload size={16} />
                        <span>Click to attach a screenshot for this step</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Empty Guide State */
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 14,
                  padding: '48px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 16
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Layers size={26} color="var(--accent-primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No steps added yet</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440 }}>
                    Build step-by-step documentation by picking screenshots from your history, importing images, or capturing new screens.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleOpenHistoryPicker()}
                    className="primary"
                    style={{ padding: '8px 16px', fontSize: 12, borderRadius: 6, gap: 6 }}
                  >
                    <Clock size={14} />
                    <span>Pick from History</span>
                  </button>
                  <label
                    className="ghost"
                    style={{
                      padding: '8px 16px',
                      fontSize: 12,
                      borderRadius: 6,
                      gap: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Upload size={14} />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* History Screenshot Picker Modal */}
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
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {replaceStepId ? 'Select Replacement Screenshot' : 'Select Screenshot for Step'}
                </span>
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
                    onClick={() => handleAddStepWithImage(item.dataUrl, item.fileName)}
                    style={{
                      height: 100,
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease'
                    }}
                    title={`Use ${item.fileName}`}
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
