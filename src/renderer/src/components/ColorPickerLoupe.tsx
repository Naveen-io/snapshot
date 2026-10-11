import React, { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';

interface ColorPickerLoupeProps {
  pixelColor: { r: number; g: number; b: number; a: number } | null;
  position: { x: number; y: number } | null;
  onClose?: () => void;
  onCopied?: (text: string) => void;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export const ColorPickerLoupe: React.FC<ColorPickerLoupeProps> = ({
  pixelColor,
  position,
  onClose,
  onCopied
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!pixelColor || !position) return null;

  const hex = rgbToHex(pixelColor.r, pixelColor.g, pixelColor.b);
  const rgb = `rgb(${pixelColor.r}, ${pixelColor.g}, ${pixelColor.b})`;
  const hsl = rgbToHsl(pixelColor.r, pixelColor.g, pixelColor.b);

  const copyValue = async (key: string, val: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    try {
      let copied = false;
      if (window.snapshotAPI?.copyText) {
        const res = await window.snapshotAPI.copyText(val);
        if (res?.success) copied = true;
      }
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(val);
          copied = true;
        }
      } catch {
        // Fallback to IPC
      }

      setCopiedKey(key);
      if (onCopied) {
        onCopied(val);
      }
      setTimeout(() => setCopiedKey(null), 1800);
    } catch (err) {
      console.error('Failed to copy color code:', err);
    }
  };

  // Clamp screen coordinates so loupe stays inside viewport
  const left = Math.min(Math.max(16, position.x + 20), window.innerWidth - 220);
  const top = Math.min(Math.max(16, position.y + 20), window.innerHeight - 200);

  return (
    <div
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        backgroundColor: 'rgba(18, 19, 22, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 100000,
        pointerEvents: 'auto',
        fontSize: '11px',
        color: '#f9fafb',
        width: 210
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: hex,
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
            {hex}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="ghost" style={{ padding: 2, borderRadius: 4 }}>
            <X size={13} color="#9ca3af" />
          </button>
        )}
      </div>

      <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Copy buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { key: 'HEX', label: hex },
          { key: 'RGB', label: rgb },
          { key: 'HSL', label: hsl }
        ].map((item) => (
          <div
            key={item.key}
            onClick={(e) => copyValue(item.key, item.label, e)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 9px',
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              border: copiedKey === item.key ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
            }}
          >
            <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 500 }}>{item.key}</span>
            <span style={{ color: '#f9fafb', fontSize: 11, fontWeight: 600 }}>{item.label}</span>
            {copiedKey === item.key ? <Check size={12} color="#10b981" /> : <Copy size={11} color="#6b7280" />}
          </div>
        ))}
      </div>
    </div>
  );
};
