import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { X, Edit3, Copy, Move, Eye } from 'lucide-react';
import './styles/theme.css';

export const PinnedViewer: React.FC = () => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!window.snapshotAPI) return;

    const cleanup = window.snapshotAPI.onPinImageLoaded((payload) => {
      setImageDataUrl(payload.dataUrl);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.snapshotAPI.windowClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cleanup();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpacityChange = (newVal: number) => {
    setOpacity(newVal);
    if (window.snapshotAPI) {
      window.snapshotAPI.setPinOpacity(newVal);
    }
  };

  const handleOpenEditor = () => {
    if (imageDataUrl && window.snapshotAPI) {
      window.snapshotAPI.openEditor({ dataUrl: imageDataUrl, width: 800, height: 600 });
      window.snapshotAPI.windowClose();
    }
  };

  const handleCopy = () => {
    if (imageDataUrl && window.snapshotAPI) {
      window.snapshotAPI.copyImage(imageDataUrl);
    }
  };

  const handleClose = () => {
    if (window.snapshotAPI) {
      window.snapshotAPI.windowClose();
    }
  };

  if (!imageDataUrl) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
        Loading pinned image...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(15, 17, 23, 0.95)',
        border: '1px solid #313746',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Mini Title/Action Bar (visible on hover) */}
      <div
        className="titlebar-drag-region"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '32px',
          backgroundColor: 'rgba(24, 27, 34, 0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #313746',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          zIndex: 10,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: isHovered ? 'auto' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 11 }}>
          <Move size={13} />
          <span>Pin</span>
        </div>

        <div className="titlebar-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Opacity control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={12} color="#94a3b8" />
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              style={{ width: 50, accentColor: '#ffffff', cursor: 'pointer' }}
              title="Window Opacity"
            />
          </div>

          <button
            onClick={handleCopy}
            className="ghost"
            style={{ padding: '3px 6px', fontSize: 11 }}
            title="Copy Image"
          >
            <Copy size={12} />
          </button>

          <button
            onClick={handleOpenEditor}
            className="ghost"
            style={{ padding: '3px 6px', fontSize: 11 }}
            title="Open in Editor"
          >
            <Edit3 size={12} />
          </button>

          <button
            onClick={handleClose}
            className="ghost"
            style={{ padding: '3px 6px', fontSize: 11, color: '#ef4444' }}
            title="Close (Escape)"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Pinned Image Viewport */}
      <div
        className="titlebar-drag-region"
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: 'grab'
        }}
      >
        <img
          src={imageDataUrl}
          alt="Pinned Capture"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            pointerEvents: 'none'
          }}
        />
      </div>
    </div>
  );
};

const pinRoot = typeof document !== 'undefined' ? document.getElementById('root') : null;
if (pinRoot) {
  ReactDOM.createRoot(pinRoot as HTMLElement).render(
    <React.StrictMode>
      <PinnedViewer />
    </React.StrictMode>
  );
}
