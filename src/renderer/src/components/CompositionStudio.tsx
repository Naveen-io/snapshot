import React from 'react';
import { CompositionSettings } from '@shared/types';
import { GRADIENT_PRESETS, RAW_COMPOSITION } from '@shared/constants';
import { X, Sparkles, Sliders, Type, Grid, Sun, RotateCcw } from 'lucide-react';

interface CompositionStudioProps {
  settings: CompositionSettings;
  onChange: (settings: CompositionSettings) => void;
  onClose: () => void;
}

export const CompositionStudio: React.FC<CompositionStudioProps> = ({
  settings,
  onChange,
  onClose
}) => {
  const update = (partial: Partial<CompositionSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const selectPreset = (preset: (typeof GRADIENT_PRESETS)[0]) => {
    update({
      gradientPresetId: preset.id,
      gradientStops: preset.colors,
      gradientFrom: preset.colors[0],
      gradientTo: preset.colors[preset.colors.length - 1],
      gradientAngle: preset.angle,
      backgroundType: 'gradient',
      haloColor: preset.colors[1] || preset.colors[0]
    });
  };

  return (
    <div
      style={{
        width: 320,
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
          fontWeight: 600
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: 13 }}>Beautifier Studio</span>
        </div>
        <button onClick={onClose} className="ghost" style={{ padding: 4 }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Reset to Raw 1:1 Screenshot */}
        <button
          type="button"
          onClick={() => onChange(RAW_COMPOSITION)}
          className="ghost"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: 600,
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-app)'
          }}
          title="Restore 1:1 raw screenshot dimensions with 0 padding, no window mockup and transparent/no background"
        >
          <RotateCcw size={13} color="var(--accent-primary)" />
          <span>Reset to Raw Screenshot (1:1 Native)</span>
        </button>

        {/* Outer Padding */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 500 }}>Canvas Padding</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{settings.padding}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="96"
            step="8"
            value={settings.padding}
            onChange={(e) => update({ padding: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
          />
        </div>

        {/* Background Style Switcher */}
        <div>
          <span style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Background Style</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {(['gradient', 'solid', 'transparent'] as const).map((type) => (
              <button
                key={type}
                onClick={() => update({ backgroundType: type })}
                className={settings.backgroundType === type ? 'primary' : 'ghost'}
                style={{ padding: '6px 4px', fontSize: '11px', textTransform: 'capitalize' }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 12+ High-End Multi-Stop Gradient Presets */}
        {settings.backgroundType === 'gradient' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>Vibrant Gradient Presets</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Multi-stop mesh</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {GRADIENT_PRESETS.map((preset) => {
                const isSelected = settings.gradientPresetId === preset.id;
                const gradStyle = `linear-gradient(${preset.angle}deg, ${preset.colors.join(', ')})`;
                return (
                  <div
                    key={preset.id}
                    onClick={() => selectPreset(preset)}
                    style={{
                      height: 48,
                      borderRadius: 8,
                      background: gradStyle,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '6px 8px',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 600,
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                      border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                      boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                      transition: 'transform 0.1s ease, border-color 0.15s ease'
                    }}
                  >
                    <span>{preset.name}</span>
                  </div>
                );
              })}
            </div>

            {/* Gradient Angle Slider */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Gradient Angle</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{settings.gradientAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={settings.gradientAngle}
                onChange={(e) => update({ gradientAngle: parseInt(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            {/* Ambient Halo Glow behind screenshot */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 10,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sun size={13} color="var(--accent-primary)" />
                <span>Ambient Glowing Halo</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showHalo}
                onChange={(e) => update({ showHalo: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
              />
            </label>
          </div>
        )}

        {/* Solid Background Color */}
        {settings.backgroundType === 'solid' && (
          <div>
            <span style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{settings.backgroundColor}</span>
            </div>
          </div>
        )}

        {/* Decorative Grid / Dot Texture Pattern */}
        <div>
          <span style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Background Pattern</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {(['none', 'dots', 'grid'] as const).map((pat) => (
              <button
                key={pat}
                onClick={() => update({ patternType: pat, showPattern: pat !== 'none' })}
                className={settings.patternType === pat ? 'primary' : 'ghost'}
                style={{ padding: '5px 4px', fontSize: '11px', textTransform: 'capitalize' }}
              >
                {pat}
              </button>
            ))}
          </div>
        </div>

        {/* Rounded Corners */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 500 }}>Corner Radius</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{settings.borderRadius}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="32"
            step="4"
            value={settings.borderRadius}
            onChange={(e) => update({ borderRadius: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
          />
        </div>

        {/* Elevation Shadow */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 500 }}>Drop Shadow Intensity</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{settings.shadowBlur}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="64"
            step="4"
            value={settings.shadowBlur}
            onChange={(e) => update({ shadowBlur: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
          />
        </div>

        {/* Window Frame Mockup Style */}
        <div>
          <span style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Window Header Frame</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {(['none', 'macos', 'windows'] as const).map((frame) => (
              <button
                key={frame}
                onClick={() => update({ frameType: frame })}
                className={settings.frameType === frame ? 'primary' : 'ghost'}
                style={{ padding: '6px 4px', fontSize: '11px', textTransform: 'capitalize' }}
              >
                {frame === 'none' ? 'Clean' : frame === 'macos' ? 'macOS Dots' : 'Windows 11'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Watermark */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Type size={13} color="var(--accent-primary)" />
              <span style={{ fontWeight: 500 }}>Watermark Tag</span>
            </div>
            <input
              type="checkbox"
              checked={settings.showWatermark}
              onChange={(e) => update({ showWatermark: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
            />
          </label>

          {settings.showWatermark && (
            <input
              type="text"
              value={settings.watermarkText || ''}
              onChange={(e) => update({ watermarkText: e.target.value })}
              placeholder="e.g. Captured with SNAPSHOT"
              style={{ width: '100%', fontSize: 11 }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
