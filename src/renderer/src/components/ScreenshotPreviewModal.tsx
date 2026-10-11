import React, { useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { ScreenshotHistoryItem } from '@shared/types';
import {
  X,
  Copy,
  Check,
  FileText,
  Loader2,
  Edit3,
  Folder,
  RefreshCw,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

interface ScreenshotPreviewModalProps {
  item: ScreenshotHistoryItem;
  onClose: () => void;
  onOpenInEditor: (dataUrl: string) => void;
  onUpdateOcrText?: (id: string, text: string) => void;
}

export const ScreenshotPreviewModal: React.FC<ScreenshotPreviewModalProps> = ({
  item,
  onClose,
  onOpenInEditor,
  onUpdateOcrText
}) => {
  const [showOcrPanel, setShowOcrPanel] = useState<boolean>(Boolean(item.ocrText));
  const [extractedText, setExtractedText] = useState<string>(item.ocrText || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);

  // Sync state if item changes
  useEffect(() => {
    if (item.ocrText) {
      setExtractedText(item.ocrText);
    }
  }, [item]);

  const runOcr = async () => {
    if (!item.dataUrl) {
      setError('No image data available for OCR extraction.');
      return;
    }

    setShowOcrPanel(true);
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setStatus('Initializing local WebAssembly OCR engine...');

    let isCancelled = false;

    try {
      // Reuses the identical local Tesseract WebAssembly worker pipeline
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            setProgress(pct);
            setStatus(`Recognizing text (${pct}%)...`);
          }
        }
      });

      if (isCancelled) {
        await worker.terminate();
        return;
      }

      setStatus('Extracting text from image...');
      const ret = await worker.recognize(item.dataUrl);

      if (!isCancelled) {
        const text = ret.data.text.trim();
        setExtractedText(text);
        setIsLoading(false);

        // Update local history persistence index
        if (text) {
          if (window.snapshotAPI) {
            await window.snapshotAPI.updateHistoryItem(item.id, { ocrText: text });
          }
          if (onUpdateOcrText) {
            onUpdateOcrText(item.id, text);
          }
        }
      }

      await worker.terminate();
    } catch (err: any) {
      console.error('Preview OCR error:', err);
      if (!isCancelled) {
        setError(err?.message || 'Failed to extract text locally');
        setIsLoading(false);
      }
    }
  };

  const handleCopyText = async () => {
    if (extractedText && window.snapshotAPI) {
      await window.snapshotAPI.copyText(extractedText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } else if (extractedText) {
      await navigator.clipboard.writeText(extractedText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleCopyImage = async () => {
    if (item.dataUrl && window.snapshotAPI) {
      await window.snapshotAPI.copyImage(item.dataUrl);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    }
  };

  const handleShowInFolder = () => {
    if (item.filePath && window.snapshotAPI) {
      window.snapshotAPI.showInFolder(item.filePath);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: 24
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '92vw',
          maxWidth: 1180,
          height: '88vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 14,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)'
          }}
        >
          {/* Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {item.fileName}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {item.width} × {item.height} px
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* OCR Extract Action */}
            <button
              type="button"
              onClick={() => {
                if (!showOcrPanel && !extractedText) {
                  runOcr();
                } else {
                  setShowOcrPanel(!showOcrPanel);
                }
              }}
              className={showOcrPanel ? 'primary' : 'ghost'}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                gap: 6
              }}
              title="Extract or View Text via Local Offline OCR"
            >
              <FileText size={14} />
              <span>{extractedText ? 'Toggle OCR Panel' : 'Extract Text (OCR)'}</span>
            </button>

            {/* Copy image button */}
            <button
              type="button"
              onClick={handleCopyImage}
              className="ghost"
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, gap: 5 }}
              title="Copy Image to Clipboard"
            >
              {copiedImage ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedImage ? 'Copied Image' : 'Copy Image'}</span>
            </button>

            {/* Open in Editor button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInEditor(item.dataUrl);
              }}
              className="ghost"
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, gap: 5 }}
              title="Open in Screenshot Editor"
            >
              <Edit3 size={14} />
              <span>Edit</span>
            </button>

            {/* Show in folder */}
            {item.filePath && (
              <button
                type="button"
                onClick={handleShowInFolder}
                className="ghost"
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, gap: 5 }}
                title="Show in Windows Explorer"
              >
                <Folder size={14} />
                <span>Folder</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="ghost"
              style={{ padding: 6, borderRadius: 6, marginLeft: 6 }}
              title="Close Preview (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Main Content Workspace */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Screenshot Preview Image View */}
          <div
            style={{
              flex: showOcrPanel ? '1 1 58%' : '1 1 100%',
              backgroundColor: '#0a0c10',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}
          >
            <img
              src={item.dataUrl}
              alt={item.fileName}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
              }}
            />
          </div>

          {/* OCR Result Panel (Preserves preview on left, text on right) */}
          {showOcrPanel && (
            <div
              style={{
                flex: '0 0 42%',
                maxWidth: 480,
                borderLeft: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {/* OCR Header Bar */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-surface-elevated)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <FileText size={15} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Extracted OCR Text</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={runOcr}
                    disabled={isLoading}
                    className="ghost"
                    style={{ padding: '4px 8px', fontSize: 11, gap: 4 }}
                    title="Re-run text recognition"
                  >
                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                    <span>Re-scan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOcrPanel(false)}
                    className="ghost"
                    style={{ padding: 4 }}
                    title="Hide OCR Panel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* OCR Body */}
              <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {isLoading ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 14
                    }}
                  >
                    <Loader2 size={32} className="animate-spin" color="var(--accent-primary)" />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Local OCR Processing
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{status}</div>
                    </div>

                    {progress > 0 && (
                      <div
                        style={{
                          width: 240,
                          height: 6,
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: 'var(--accent-primary)',
                            transition: 'width 0.2s ease'
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : error ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      padding: 24,
                      textAlign: 'center'
                    }}
                  >
                    <AlertCircle size={32} color="var(--danger-primary)" />
                    <span style={{ fontSize: 13, color: 'var(--danger-primary)', fontWeight: 600 }}>
                      Extraction Failed
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{error}</span>
                    <button
                      type="button"
                      onClick={runOcr}
                      className="primary"
                      style={{ marginTop: 8, padding: '6px 14px', fontSize: 12 }}
                    >
                      Retry OCR
                    </button>
                  </div>
                ) : extractedText ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Select any portion of text to copy, or use Copy All Text below:
                    </div>
                    <textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      placeholder="Extracted text..."
                      style={{
                        flex: 1,
                        width: '100%',
                        backgroundColor: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1.5,
                        resize: 'none',
                        outline: 'none',
                        userSelect: 'text'
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      padding: 24
                    }}
                  >
                    <FileText size={32} color="var(--border-default)" />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>No Text Detected</span>
                    <span style={{ fontSize: 12, maxWidth: 260 }}>
                      No readable text characters were found in this screenshot.
                    </span>
                    <button
                      type="button"
                      onClick={runOcr}
                      className="ghost"
                      style={{ marginTop: 6, padding: '6px 12px', fontSize: 12 }}
                    >
                      Re-scan Screenshot
                    </button>
                  </div>
                )}
              </div>

              {/* OCR Footer Actions */}
              {extractedText && !isLoading && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--bg-surface-elevated)'
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {extractedText.length} characters
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="primary"
                    style={{ padding: '6px 14px', fontSize: 12, gap: 6 }}
                  >
                    {copiedText ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedText ? 'Copied to Clipboard!' : 'Copy All Text'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
