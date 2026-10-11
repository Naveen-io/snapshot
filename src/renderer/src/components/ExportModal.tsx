import React, { useState } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';

interface ExportModalProps {
  previewDataUrl: string;
  width: number;
  height: number;
  onClose: () => void;
  onSaveToFile: (format: 'png' | 'jpeg' | 'webp', quality: number) => Promise<void>;
  onCopyToClipboard: (format: 'png' | 'jpeg' | 'webp', quality: number) => Promise<void>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  previewDataUrl,
  width,
  height,
  onClose,
  onSaveToFile,
  onCopyToClipboard
}) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState<number>(95);
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleCopy = async () => {
    setIsProcessing(true);
    await onCopyToClipboard(format, quality);
    setIsProcessing(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setIsProcessing(true);
    await onSaveToFile(format, quality);
    setIsProcessing(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
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
          width: 560,
          maxHeight: '85vh',
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
            <Download size={16} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Export Screenshot</span>
          </div>
          <button onClick={onClose} className="ghost" style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {/* Image Preview */}
          <div
            style={{
              width: '100%',
              height: 220,
              backgroundColor: 'var(--bg-app)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: 8
            }}
          >
            <img
              src={previewDataUrl}
              alt="Export Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 4
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>Dimensions: {width} × {height} px</span>
            <span>Alpha Transparency: {format === 'png' ? 'Preserved' : 'Flattened'}</span>
          </div>

          {/* Format selection */}
          <div>
            <span style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>Image Format:</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={format === fmt ? 'primary' : 'ghost'}
                  style={{ textTransform: 'uppercase', padding: '6px 12px' }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider for JPEG / WebP */}
          {format !== 'png' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Compression Quality:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{quality}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
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
            Cancel
          </button>
          <button onClick={handleCopy} disabled={isProcessing} className="ghost">
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
          </button>
          <button onClick={handleSave} disabled={isProcessing} className="primary">
            {saved ? <Check size={14} /> : <Download size={14} />}
            <span>{saved ? 'Saved Successfully!' : 'Save Image File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
