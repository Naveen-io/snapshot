import React, { useState, useRef, useEffect } from 'react';
import {
  Monitor,
  AppWindow,
  Crop,
  ChevronDown,
  Check,
  Mic,
  MicOff,
  Copy,
  Edit3,
  Save,
  Pin,
  X,
  Clock
} from 'lucide-react';
import { AppleCaptureMode } from '@shared/types';

export interface CaptureToolbarOptions {
  destination: 'clipboard' | 'folder' | 'editor' | 'pin';
  timer: 0 | 3 | 5 | 10;
  micEnabled: boolean;
}

interface CaptureToolbarProps {
  selection?: { x: number; y: number; width: number; height: number } | null;
  virtualBounds: { width: number; height: number };
  allScreens?: { displayId: number; bounds: { width: number; height: number } }[];
  currentScreenId?: number;
  mode?: AppleCaptureMode;
  onModeChange?: (mode: AppleCaptureMode) => void;
  options?: CaptureToolbarOptions;
  onOptionsChange?: (options: CaptureToolbarOptions) => void;
  onAction?: () => void;
  onSwitchDisplay?: () => void;
  onQuickCopy: () => void;
  onOpenEditor: () => void;
  onSave: () => void;
  onPin: () => void;
  onCancel: () => void;
  isRecording?: boolean;
}

export const CaptureToolbar: React.FC<CaptureToolbarProps> = ({
  selection,
  virtualBounds,
  allScreens,
  currentScreenId,
  mode = 'capture-portion',
  onModeChange,
  options = { destination: 'clipboard', timer: 0, micEnabled: false },
  onOptionsChange,
  onAction,
  onSwitchDisplay,
  onQuickCopy,
  onOpenEditor,
  onSave,
  onPin,
  onCancel,
  isRecording = false
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  // Close options dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    if (showOptions) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showOptions]);

  const hasMultipleDisplays = Boolean(allScreens && allScreens.length > 1);
  const currentScreenIndex = hasMultipleDisplays && allScreens
    ? allScreens.findIndex((s) => s.displayId === currentScreenId) + 1
    : 1;

  const isVideoMode = mode === 'record-screen' || mode === 'record-portion';
  const hasSelection = Boolean(selection && selection.width > 10 && selection.height > 10);

  const handleSelectMode = (newMode: AppleCaptureMode) => {
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const updateOptions = (updates: Partial<CaptureToolbarOptions>) => {
    if (onOptionsChange) {
      onOptionsChange({ ...options, ...updates });
    }
  };

  const handlePrimaryAction = () => {
    if (onAction) {
      onAction();
    } else if (isVideoMode) {
      // Fallback
      onSave();
    } else {
      switch (options.destination) {
        case 'clipboard':
          onQuickCopy();
          break;
        case 'editor':
          onOpenEditor();
          break;
        case 'pin':
          onPin();
          break;
        case 'folder':
        default:
          onSave();
          break;
      }
    }
  };

  return (
    <div
      className="capture-toolbar"
      data-no-capture="true"
      style={{
        position: 'absolute',
        bottom: '28px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(26, 27, 30, 0.92)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        padding: '5px 8px',
        gap: '4px',
        zIndex: 10000,
        pointerEvents: 'auto',
        userSelect: 'none',
        height: '48px'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* SECTION 1: STILL CAPTURE MODES */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {/* Capture Entire Screen */}
        <button
          type="button"
          data-no-capture="true"
          onClick={() => handleSelectMode('capture-screen')}
          className="ghost"
          title="Capture Entire Screen"
          style={{
            padding: '6px 9px',
            borderRadius: '7px',
            backgroundColor: mode === 'capture-screen' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
            color: mode === 'capture-screen' ? '#ffffff' : 'rgba(255, 255, 255, 0.72)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
        >
          <Monitor size={17} />
        </button>

        {/* Capture Selected Window */}
        <button
          type="button"
          data-no-capture="true"
          onClick={() => handleSelectMode('capture-window')}
          className="ghost"
          title="Capture Selected Window"
          style={{
            padding: '6px 9px',
            borderRadius: '7px',
            backgroundColor: mode === 'capture-window' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
            color: mode === 'capture-window' ? '#ffffff' : 'rgba(255, 255, 255, 0.72)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
        >
          <AppWindow size={17} />
        </button>

        {/* Capture Selected Portion */}
        <button
          type="button"
          data-no-capture="true"
          onClick={() => handleSelectMode('capture-portion')}
          className="ghost"
          title="Capture Selected Portion"
          style={{
            padding: '6px 9px',
            borderRadius: '7px',
            backgroundColor: mode === 'capture-portion' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
            color: mode === 'capture-portion' ? '#ffffff' : 'rgba(255, 255, 255, 0.72)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
        >
          <Crop size={17} />
        </button>
      </div>

      {/* HAIRLINE DIVIDER */}
      <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.14)', margin: '0 3px' }} />

      {/* SECTION 2: VIDEO RECORD MODES */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {/* Record Entire Screen */}
        <button
          type="button"
          data-no-capture="true"
          onClick={() => handleSelectMode('record-screen')}
          className="ghost"
          title="Record Entire Screen"
          style={{
            padding: '6px 9px',
            borderRadius: '7px',
            position: 'relative',
            backgroundColor: mode === 'record-screen' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
            color: mode === 'record-screen' ? '#ffffff' : 'rgba(255, 255, 255, 0.72)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
        >
          <Monitor size={17} />
          <span
            style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ef4444'
            }}
          />
        </button>

        {/* Record Selected Portion */}
        <button
          type="button"
          data-no-capture="true"
          onClick={() => handleSelectMode('record-portion')}
          className="ghost"
          title="Record Selected Portion"
          style={{
            padding: '6px 9px',
            borderRadius: '7px',
            position: 'relative',
            backgroundColor: mode === 'record-portion' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
            color: mode === 'record-portion' ? '#ffffff' : 'rgba(255, 255, 255, 0.72)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
        >
          <Crop size={17} />
          <span
            style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ef4444'
            }}
          />
        </button>
      </div>

      {/* HAIRLINE DIVIDER */}
      <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.14)', margin: '0 3px' }} />

      {/* SECTION 3: OPTIONS POPOVER */}
      <div style={{ position: 'relative' }} ref={optionsRef}>
        <button
          type="button"
          data-no-capture="true"
          onClick={() => setShowOptions(!showOptions)}
          className="ghost"
          title="Capture & Recording Options"
          style={{
            padding: '5px 10px',
            borderRadius: '7px',
            backgroundColor: showOptions ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
            color: '#f3f4f6',
            border: 'none',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>Options</span>
          <ChevronDown size={13} style={{ transform: showOptions ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
        </button>

        {showOptions && (
          <div
            data-no-capture="true"
            style={{
              position: 'absolute',
              bottom: '52px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '210px',
              backgroundColor: 'rgba(26, 27, 30, 0.96)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '10px',
              boxShadow: '0 18px 48px rgba(0, 0, 0, 0.75)',
              padding: '6px 0',
              zIndex: 10002,
              fontSize: '12px',
              color: '#f3f4f6'
            }}
          >
            {/* Save To Group */}
            <div style={{ padding: '4px 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9ca3af', fontWeight: 600 }}>
              Save To
            </div>
            {[
              { id: 'clipboard', label: 'Clipboard' },
              { id: 'folder', label: 'Screenshots Folder' },
              { id: 'editor', label: 'Screenshot Editor' },
              { id: 'pin', label: 'Pin on Screen' }
            ].map((dest) => (
              <div
                key={dest.id}
                onClick={() => {
                  updateOptions({ destination: dest.id as any });
                }}
                style={{
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: options.destination === dest.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
                }}
              >
                <span>{dest.label}</span>
                {options.destination === dest.id && <Check size={13} color="#ffffff" />}
              </div>
            ))}

            <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '5px 0' }} />

            {/* Timer Group */}
            <div style={{ padding: '4px 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9ca3af', fontWeight: 600 }}>
              Timer
            </div>
            {[
              { value: 0, label: 'None' },
              { value: 3, label: '3 Seconds' },
              { value: 5, label: '5 Seconds' },
              { value: 10, label: '10 Seconds' }
            ].map((t) => (
              <div
                key={t.value}
                onClick={() => updateOptions({ timer: t.value as any })}
                style={{
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: options.timer === t.value ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
                }}
              >
                <span>{t.label}</span>
                {options.timer === t.value && <Check size={13} color="#ffffff" />}
              </div>
            ))}

            <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '5px 0' }} />

            {/* Microphone Toggle for Recording */}
            <div style={{ padding: '4px 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9ca3af', fontWeight: 600 }}>
              Microphone
            </div>
            <div
              onClick={() => updateOptions({ micEnabled: !options.micEnabled })}
              style={{
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                backgroundColor: options.micEnabled ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {options.micEnabled ? <Mic size={13} color="#ef4444" /> : <MicOff size={13} color="#9ca3af" />}
                <span>{options.micEnabled ? 'Built-in Microphone' : 'Off (Muted)'}</span>
              </div>
              {options.micEnabled && <Check size={13} color="#ffffff" />}
            </div>

            {/* Display Switcher if Multi-Monitor */}
            {hasMultipleDisplays && onSwitchDisplay && (
              <>
                <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '5px 0' }} />
                <div style={{ padding: '4px 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9ca3af', fontWeight: 600 }}>
                  Display
                </div>
                <div
                  onClick={() => onSwitchDisplay()}
                  style={{
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <span>Switch Display (Display {currentScreenIndex})</span>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>Tab</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* HAIRLINE DIVIDER */}
      <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.14)', margin: '0 3px' }} />

      {/* SECTION 4: PRIMARY ACTION BUTTON (Capture or Record) */}
      <button
        type="button"
        data-no-capture="true"
        onClick={handlePrimaryAction}
        className={isVideoMode ? 'danger' : 'primary'}
        title={isVideoMode ? 'Start Screen Recording (Enter)' : 'Capture Screenshot (Enter)'}
        style={{
          padding: '6px 14px',
          borderRadius: '7px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          backgroundColor: isVideoMode ? '#ef4444' : '#ffffff',
          color: isVideoMode ? '#ffffff' : '#111827',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: isVideoMode ? '0 2px 8px rgba(239, 68, 68, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.25)'
        }}
      >
        {isVideoMode ? (
          <>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#ffffff'
              }}
            />
            <span>Record</span>
          </>
        ) : (
          <span>{options.destination === 'clipboard' ? 'Copy' : 'Capture'}</span>
        )}
        <span
          style={{
            fontSize: '10px',
            opacity: 0.7,
            backgroundColor: isVideoMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
            padding: '1px 4px',
            borderRadius: '4px'
          }}
        >
          ↵
        </span>
      </button>

      {/* OPTIONAL QUICK ACTIONS (when selection exists in photo mode) */}
      {!isVideoMode && hasSelection && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '2px' }}>
          {/* Quick Edit */}
          <button
            type="button"
            data-no-capture="true"
            onClick={onOpenEditor}
            className="ghost"
            title="Open in Editor (E)"
            style={{
              padding: '6px 7px',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.72)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Edit3 size={15} />
          </button>

          {/* Quick Save */}
          <button
            type="button"
            data-no-capture="true"
            onClick={onSave}
            className="ghost"
            title="Save to Folder (S)"
            style={{
              padding: '6px 7px',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.72)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Save size={15} />
          </button>

          {/* Quick Pin */}
          <button
            type="button"
            data-no-capture="true"
            onClick={onPin}
            className="ghost"
            title="Pin to Screen (P)"
            style={{
              padding: '6px 7px',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.72)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Pin size={15} />
          </button>
        </div>
      )}

      {/* HAIRLINE DIVIDER */}
      <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.14)', margin: '0 3px' }} />

      {/* SECTION 5: CLOSE (Esc) */}
      <button
        type="button"
        data-no-capture="true"
        onClick={onCancel}
        className="ghost"
        title="Cancel (Esc)"
        style={{
          padding: '6px 7px',
          borderRadius: '7px',
          color: 'rgba(255, 255, 255, 0.65)',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

