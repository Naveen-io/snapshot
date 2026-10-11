import React, { useState, useEffect } from 'react';
import { AppSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';
import {
  Settings,
  Camera,
  Save,
  Clock,
  Shield,
  Folder,
  Keyboard,
  Check,
  AlertCircle,
  Radio,
  Sliders,
  Monitor
} from 'lucide-react';

interface SettingsViewProps {
  onThemeChange?: (theme: 'dark' | 'light') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onThemeChange }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'general' | 'capture' | 'saving' | 'history' | 'privacy'>('general');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [hotkeyStatus, setHotkeyStatus] = useState<{ conflict?: boolean; message?: string } | null>(null);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      if (window.snapshotAPI) {
        const loaded = await window.snapshotAPI.getSettings();
        if (loaded) {
          setSettings(loaded);
        }
      }
    }
    load();
  }, []);

  const saveChanges = async (updated: AppSettings) => {
    setSettings(updated);
    if (window.snapshotAPI) {
      await window.snapshotAPI.saveSettings(updated);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    }
  };

  const handleSelectDirectory = async () => {
    if (window.snapshotAPI) {
      const selected = await window.snapshotAPI.selectDirectory();
      if (selected) {
        const updated = {
          ...settings,
          saving: { ...settings.saving, saveDirectory: selected }
        };
        saveChanges(updated);
      }
    }
  };

  // Keyboard shortcut listener when recording
  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setIsRecording(false);
        setRecordedKeys([]);
        return;
      }

      const keys: string[] = [];
      let acceleratorParts: string[] = [];

      if (e.ctrlKey) {
        keys.push('Ctrl');
        acceleratorParts.push('CommandOrControl');
      }
      if (e.altKey) {
        keys.push('Alt');
        acceleratorParts.push('Alt');
      }
      if (e.shiftKey) {
        keys.push('Shift');
        acceleratorParts.push('Shift');
      }

      // Check primary key
      const keyUpper = e.key.toUpperCase();
      if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(keyUpper)) {
        keys.push(keyUpper);
        acceleratorParts.push(keyUpper);

        // We have a complete hotkey!
        const finalAccelerator = acceleratorParts.join('+');
        setRecordedKeys(keys);
        setIsRecording(false);

        // Apply and test with Electron
        if (window.snapshotAPI) {
          const res = await window.snapshotAPI.registerHotkey(finalAccelerator);
          if (res.conflict) {
            setHotkeyStatus({ conflict: true, message: res.error || 'Hotkey conflict with another program' });
          } else {
            setHotkeyStatus({ conflict: false, message: `Successfully registered: ${keys.join(' + ')}` });
            const updated = {
              ...settings,
              capture: { ...settings.capture, hotkey: finalAccelerator }
            };
            saveChanges(updated);
            setTimeout(() => setHotkeyStatus(null), 3000);
          }
        }
      } else {
        setRecordedKeys(keys);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, settings]);

  // Format accelerator into readable keys
  const formatHotkey = (acc: string): string[] => {
    return acc
      .replace(/CommandOrControl/g, 'Ctrl')
      .split('+')
      .map((k) => k.trim());
  };

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', backgroundColor: 'var(--bg-app)' }}>
      {/* Settings Navigation Sidebar */}
      <div
        style={{
          width: 210,
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          padding: '16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '0 8px', marginBottom: 6, letterSpacing: '0.5px' }}>
          SETTINGS
        </span>

        {[
          { id: 'general', label: 'General', icon: <Settings size={15} /> },
          { id: 'capture', label: 'Capture & Shortcuts', icon: <Camera size={15} /> },
          { id: 'saving', label: 'Save & Export', icon: <Save size={15} /> },
          { id: 'history', label: 'Local History', icon: <Clock size={15} /> },
          { id: 'privacy', label: 'Privacy & Security', icon: <Shield size={15} /> }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={isActive ? 'primary' : 'ghost'}
              style={{
                justifyContent: 'flex-start',
                padding: '9px 12px',
                fontSize: 13,
                gap: 9,
                borderRadius: 8
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}

        {savedToast && (
          <div
            style={{
              marginTop: 'auto',
              padding: '8px 10px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--success-primary)',
              borderRadius: 6,
              color: 'var(--success-primary)',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Check size={13} />
            <span>Preferences saved</span>
          </div>
        )}
      </div>

      {/* Main Settings Panel */}
      <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
        {/* General Tab */}
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>General Settings</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Configure application launch and window behavior.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Launch on Windows Startup</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Automatically launch SNAPSHOT when logging into Windows</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.general.startWithWindows}
                  onChange={(e) =>
                    saveChanges({ ...settings, general: { ...settings.general, startWithWindows: e.target.checked } })
                  }
                  style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Start Minimized to System Tray</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Run silently in background tray without opening main window</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.general.startMinimized}
                  onChange={(e) =>
                    saveChanges({ ...settings, general: { ...settings.general, startMinimized: e.target.checked } })
                  }
                  style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Close to System Tray</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Clicking the 'X' button keeps SNAPSHOT alive in system tray</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.general.closeToTray}
                  onChange={(e) =>
                    saveChanges({ ...settings, general: { ...settings.general, closeToTray: e.target.checked } })
                  }
                  style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Visual Theme</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['dark', 'light'] as const).map((th) => (
                    <button
                      key={th}
                      onClick={() => {
                        const updated = { ...settings, general: { ...settings.general, theme: th } };
                        saveChanges(updated);
                        if (onThemeChange) onThemeChange(th);
                      }}
                      className={settings.general.theme === th ? 'primary' : 'ghost'}
                      style={{ textTransform: 'capitalize', padding: '6px 16px' }}
                    >
                      {th} Theme
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Capture & Shortcuts Tab */}
        {activeTab === 'capture' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Capture & Shortcuts</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Customize global hotkeys and framing behavior.
              </p>
            </div>

            {/* Interactive Shortcut Recorder */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: isRecording ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: '18px 20px',
                boxShadow: isRecording ? '0 0 16px var(--accent-glow)' : 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Global Screenshot Shortcut</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Trigger capture anywhere in Windows, even when other apps are focused.
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsRecording(!isRecording);
                    setRecordedKeys([]);
                  }}
                  className={isRecording ? 'primary' : 'ghost'}
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 8,
                    gap: 6
                  }}
                >
                  <Keyboard size={15} />
                  <span>{isRecording ? 'Recording...' : 'Record Shortcut'}</span>
                </button>
              </div>

              {/* Shortcut Display Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-app)',
                  borderRadius: 8,
                  border: '1px solid var(--border-default)',
                  minHeight: 44
                }}
              >
                {isRecording ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-light)' }}>
                    <span style={{ animation: 'pulse 1s infinite', fontSize: 13 }}>●</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {recordedKeys.length > 0 ? recordedKeys.join(' + ') : 'Press key combination (e.g. Ctrl + Shift + S)...'}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {formatHotkey(settings.capture.hotkey).map((k) => (
                      <span
                        key={k}
                        style={{
                          display: 'inline-block',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 6,
                          padding: '3px 10px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {hotkeyStatus && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: hotkeyStatus.conflict ? 'var(--danger-primary)' : 'var(--success-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  {hotkeyStatus.conflict ? <AlertCircle size={14} /> : <Check size={14} />}
                  <span>{hotkeyStatus.message}</span>
                </div>
              )}
            </div>

            {/* Countdown timer */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Delayed Capture Duration</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Countdown before freezing screen (useful for dropdown menus)</div>
              </div>
              <select
                value={settings.capture.delaySeconds}
                onChange={(e) =>
                  saveChanges({ ...settings, capture: { ...settings.capture, delaySeconds: parseInt(e.target.value) } })
                }
                style={{ width: 170 }}
              >
                <option value={0}>Instant (0s)</option>
                <option value={3}>3 Seconds Delay</option>
                <option value={5}>5 Seconds Delay</option>
                <option value={10}>10 Seconds Delay</option>
              </select>
            </div>

            {/* Floating toolbar toggle */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Show Floating Action Toolbar</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Display Copy, Edit, Save, and Pin buttons next to selection</div>
              </div>
              <input
                type="checkbox"
                checked={settings.capture.showToolbar}
                onChange={(e) =>
                  saveChanges({ ...settings, capture: { ...settings.capture, showToolbar: e.target.checked } })
                }
                style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}

        {/* Save & Export Tab */}
        {activeTab === 'saving' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Save & Export Settings</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Configure destination folders, image formats, and filename templates.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Default Screenshots Folder</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Saved captures will be written to this location.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={settings.saving.saveDirectory}
                    style={{ flex: 1, backgroundColor: 'var(--bg-app)' }}
                  />
                  <button onClick={handleSelectDirectory} className="ghost">
                    <Folder size={15} />
                    <span>Browse</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Default File Format</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() =>
                        saveChanges({ ...settings, saving: { ...settings.saving, defaultFormat: fmt } })
                      }
                      className={settings.saving.defaultFormat === fmt ? 'primary' : 'ghost'}
                      style={{ textTransform: 'uppercase', padding: '6px 16px' }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Auto-Save on Quick Capture (Enter)</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Automatically save file to disk when copying with Enter</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.saving.autoSave}
                  onChange={(e) =>
                    saveChanges({ ...settings, saving: { ...settings.saving, autoSave: e.target.checked } })
                  }
                  style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Local History</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Manage local retention limits and storage.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Enable Local History</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Keep thumbnails and metadata for recent captures</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.history.enabled}
                  onChange={(e) =>
                    saveChanges({ ...settings, history: { ...settings.history, enabled: e.target.checked } })
                  }
                  style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Maximum Stored Captures</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Automatically prunes older captures when threshold is reached</div>
                </div>
                <select
                  value={settings.history.maxItems}
                  onChange={(e) =>
                    saveChanges({ ...settings, history: { ...settings.history, maxItems: parseInt(e.target.value) } })
                  }
                  style={{ width: 170 }}
                >
                  <option value={50}>50 Captures</option>
                  <option value={100}>100 Captures</option>
                  <option value={200}>200 Captures</option>
                  <option value={500}>500 Captures</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Privacy & Offline Integrity</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Guaranteed zero cloud tracking and 100% offline security.
              </p>
            </div>

            <div
              style={{
                padding: 20,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                fontSize: 13,
                lineHeight: 1.6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-light)', fontWeight: 600 }}>
                <Shield size={20} />
                <span style={{ fontSize: 14 }}>100% Offline & Private by Design</span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>
                SNAPSHOT operates completely on your local machine. No screenshots, annotations, extracted OCR text, or
                metadata are ever uploaded to any cloud server, AI service, or remote API.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                <div>• Zero telemetry or user analytics.</div>
                <div>• Local WebAssembly OCR engine running offline in sandbox.</div>
                <div>• Secure Redaction sanitizes underlying pixels permanently from exported files.</div>
                <div>• Local storage is kept in your user profile directory.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
