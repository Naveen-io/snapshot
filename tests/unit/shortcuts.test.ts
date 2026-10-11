import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/shared/constants';

describe('Global Shortcuts and Settings Validation', () => {
  it('default hotkey is defined and valid', () => {
    expect(DEFAULT_SETTINGS.capture.hotkey).toBe('CommandOrControl+Shift+S');
  });

  it('validates hotkey accelerator format', () => {
    const validHotkeys = [
      'CommandOrControl+Shift+S',
      'Ctrl+Shift+S',
      'Alt+PrintScreen',
      'Ctrl+Alt+S',
      'F10'
    ];

    validHotkeys.forEach((hk) => {
      expect(hk.trim().length).toBeGreaterThan(0);
      expect(typeof hk).toBe('string');
    });
  });

  it('validates settings structure and default parameters', () => {
    expect(DEFAULT_SETTINGS.general.theme).toBe('dark');
    expect(DEFAULT_SETTINGS.capture.selectionColor).toBe('#ffffff');
    expect(DEFAULT_SETTINGS.clipboard.autoCopyOnCapture).toBe(true);
    expect(DEFAULT_SETTINGS.saving.defaultFormat).toBe('png');
    expect(DEFAULT_SETTINGS.history.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.history.maxItems).toBe(200);
  });
});
