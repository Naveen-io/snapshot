import React, { useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { X, Copy, Check, FileText, Loader2 } from 'lucide-react';

interface OcrModalProps {
  imageDataUrl: string | null;
  onClose: () => void;
  onExtractedText?: (text: string) => void;
}

export const OcrModal: React.FC<OcrModalProps> = ({ imageDataUrl, onClose, onExtractedText }) => {
  const [extractedText, setExtractedText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('Initializing local OCR engine...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function runOcr() {
      if (!imageDataUrl) {
        setIsLoading(false);
        setError('No image provided for text extraction.');
        return;
      }

      try {
        setIsLoading(true);
        setStatus('Loading OCR WebAssembly worker...');

        // Tesseract.js creates a web worker running local WebAssembly
        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
              setStatus(`Recognizing text (${Math.round(m.progress * 100)}%)...`);
            }
          }
        });

        if (isCancelled) {
          await worker.terminate();
          return;
        }

        setStatus('Extracting text from image...');
        const ret = await worker.recognize(imageDataUrl);

        if (!isCancelled) {
          const text = ret.data.text.trim();
          setExtractedText(text || 'No text recognized in screenshot.');
          setIsLoading(false);
          if (text && onExtractedText) {
            onExtractedText(text);
          }
        }

        await worker.terminate();
      } catch (err: any) {
        console.error('OCR Extraction error:', err);
        if (!isCancelled) {
          setError(err?.message || 'Failed to extract text locally');
          setIsLoading(false);
        }
      }
    }

    runOcr();

    return () => {
      isCancelled = true;
    };
  }, [imageDataUrl]);

  const handleCopy = () => {
    if (extractedText && window.snapshotAPI) {
      window.snapshotAPI.copyText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          maxHeight: '80vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Local Offline OCR Text Extraction</span>
          </div>
          <button onClick={onClose} className="ghost" style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '36px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Loader2 size={28} className="animate-spin" color="var(--accent-primary)" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{status}</span>
              {progress > 0 && (
                <div style={{ width: '80%', height: 6, backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--accent-primary)', transition: 'width 0.2s ease' }} />
                </div>
              )}
            </div>
          ) : error ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--danger-primary)' }}>
              {error}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Extracted text is processed completely on your device.
              </div>
              <textarea
                value={extractedText}
                readOnly
                rows={10}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  padding: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  resize: 'vertical',
                  userSelect: 'text'
                }}
              />
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '12px 16px',
            borderTop: '1px solid var(--border-subtle)',
            gap: 8
          }}
        >
          <button onClick={onClose} className="ghost">
            Close
          </button>
          <button
            onClick={handleCopy}
            disabled={isLoading || !extractedText || !!error}
            className="primary"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Extracted Text'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
