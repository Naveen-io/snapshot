import React from 'react';
import { COLOR_SWATCHES } from '@shared/constants';
import { ToolType, RedactionStyle, StampType } from '@shared/types';
import { Trash2, CheckCircle2, XCircle, AlertTriangle, Star, Heart, HelpCircle, Bold, Sparkles } from 'lucide-react';

interface ToolPropertiesProps {
  currentTool: ToolType;
  selectedColor: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  fontFamily?: string;
  onChangeFontFamily?: (family: string) => void;
  fontWeight?: 'normal' | 'bold';
  onChangeFontWeight?: (weight: 'normal' | 'bold') => void;
  hasBackground?: boolean;
  onChangeHasBackground?: (has: boolean) => void;
  redactionStyle: RedactionStyle;
  onChangeRedactionStyle: (style: RedactionStyle) => void;
  stampType: StampType;
  onChangeStampType: (stamp: StampType) => void;
  magnification: number;
  onChangeMagnification: (mag: number) => void;
  hasSelectedAnnotation: boolean;
  onDeleteSelectedAnnotation: () => void;
}

export const ToolProperties: React.FC<ToolPropertiesProps> = ({
  currentTool,
  selectedColor,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  fontSize,
  onChangeFontSize,
  fontFamily = 'Segoe UI, sans-serif',
  onChangeFontFamily,
  fontWeight = 'bold',
  onChangeFontWeight,
  hasBackground = false,
  onChangeHasBackground,
  redactionStyle,
  onChangeRedactionStyle,
  stampType,
  onChangeStampType,
  magnification,
  onChangeMagnification,
  hasSelectedAnnotation,
  onDeleteSelectedAnnotation
}) => {
  const strokeSizes = [2, 4, 6, 8, 12];
  const fontSizes = [14, 18, 24, 32, 48];

  const showsColor = !['blur', 'spotlight', 'color-picker', 'redact'].includes(currentTool);
  const showsStroke = !['blur', 'spotlight', 'text', 'color-picker', 'redact', 'stamp', 'loupe-annotation'].includes(currentTool);
  const showsFont = currentTool === 'text' || currentTool === 'callout';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 14px',
        backgroundColor: 'rgba(14, 15, 18, 0.98)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '11px',
        color: '#9ca3af',
        gap: 12,
        flexWrap: 'wrap',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Colors palette */}
        {showsColor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {COLOR_SWATCHES.map((c) => (
                <div
                  key={c}
                  onClick={() => onChangeColor(c)}
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: selectedColor === c ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: selectedColor === c ? '0 0 6px rgba(255, 255, 255, 0.5)' : 'none',
                    transform: selectedColor === c ? 'scale(1.15)' : 'none',
                    transition: 'transform 0.12s ease'
                  }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => onChangeColor(e.target.value)}
                style={{
                  width: 20,
                  height: 20,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  marginLeft: 2
                }}
                title="Custom Color"
              />
            </div>
          </div>
        )}

        {/* Redaction Style options */}
        {currentTool === 'redact' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Style</span>
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '7px',
                padding: '2px',
                gap: 2
              }}
            >
              {[
                { id: 'blur', label: 'Frosted Blur' },
                { id: 'pixelate', label: 'Pixel Mosaic' },
                { id: 'blackout', label: 'Charcoal Bar' }
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onChangeRedactionStyle(style.id as RedactionStyle)}
                  className="ghost"
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: '5px',
                    backgroundColor: redactionStyle === style.id ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                    color: redactionStyle === style.id ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stamps Selector */}
        {currentTool === 'stamp' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Badge</span>
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '7px',
                padding: '2px',
                gap: 2
              }}
            >
              {[
                { id: 'check', icon: <CheckCircle2 size={13} color="#10b981" />, label: 'Pass' },
                { id: 'cross', icon: <XCircle size={13} color="#ef4444" />, label: 'Fail' },
                { id: 'warning', icon: <AlertTriangle size={13} color="#f59e0b" />, label: 'Warning' },
                { id: 'star', icon: <Star size={13} color="#eab308" />, label: 'Star' },
                { id: 'heart', icon: <Heart size={13} color="#ec4899" />, label: 'Heart' },
                { id: 'question', icon: <HelpCircle size={13} color="#9ca3af" />, label: 'Info' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChangeStampType(s.id as StampType)}
                  className="ghost"
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '5px',
                    backgroundColor: stampType === s.id ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                    color: stampType === s.id ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  {s.icon}
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Magnification Level */}
        {currentTool === 'loupe-annotation' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Zoom</span>
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '7px',
                padding: '2px',
                gap: 2
              }}
            >
              {[2, 3, 4].map((mag) => (
                <button
                  key={mag}
                  type="button"
                  onClick={() => onChangeMagnification(mag)}
                  className="ghost"
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: '5px',
                    backgroundColor: magnification === mag ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                    color: magnification === mag ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {mag}×
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stroke thickness selector */}
        {showsStroke && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Width</span>
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '7px',
                padding: '2px',
                gap: 2
              }}
            >
              {strokeSizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onChangeStrokeWidth(sz)}
                  className="ghost"
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '5px',
                    backgroundColor: strokeWidth === sz ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                    color: strokeWidth === sz ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                    border: 'none',
                    cursor: 'pointer',
                    minWidth: 26,
                    textAlign: 'center'
                  }}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Font size selector */}
        {showsFont && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Size</span>
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '7px',
                padding: '2px',
                gap: 2
              }}
            >
              {fontSizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onChangeFontSize(sz)}
                  className="ghost"
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '5px',
                    backgroundColor: fontSize === sz ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                    color: fontSize === sz ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typography family, weight, and background badge */}
        {currentTool === 'text' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)' }}>Font</span>
              <select
                value={fontFamily}
                onChange={(e) => onChangeFontFamily?.(e.target.value)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#f3f4f6',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Segoe UI, sans-serif">Segoe UI</option>
                <option value="Inter, sans-serif">Inter</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Consolas, monospace">Consolas (Mono)</option>
                <option value="Impact, sans-serif">Impact</option>
                <option value="Georgia, serif">Georgia</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => onChangeFontWeight?.(fontWeight === 'bold' ? 'normal' : 'bold')}
              className="ghost"
              title="Toggle Bold Weight"
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: fontWeight === 'bold' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                color: fontWeight === 'bold' ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                border: 'none',
                cursor: 'pointer',
                height: 22
              }}
            >
              <Bold size={12} />
            </button>

            <button
              type="button"
              onClick={() => onChangeHasBackground?.(!hasBackground)}
              className="ghost"
              title="Toggle Text Background Badge Pill"
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: hasBackground ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                color: hasBackground ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                border: 'none',
                cursor: 'pointer',
                height: 22,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Sparkles size={11} />
              <span>Badge</span>
            </button>
          </div>
        )}
      </div>

      {/* Right side: Delete selected annotation */}
      {hasSelectedAnnotation && (
        <button
          type="button"
          onClick={onDeleteSelectedAnnotation}
          className="ghost"
          style={{
            color: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            padding: '3px 9px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
          title="Delete Selected Annotation (Delete/Backspace)"
        >
          <Trash2 size={12} />
          <span>Delete</span>
        </button>
      )}
    </div>
  );
};
