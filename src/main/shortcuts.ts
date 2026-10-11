import { globalShortcut } from 'electron';

export class ShortcutService {
  private currentHotkey: string = '';
  private onTriggerCallback: (() => void) | null = null;

  constructor(onTrigger: () => void) {
    this.onTriggerCallback = onTrigger;
  }

  /**
   * Registers a global shortcut.
   * Returns { success: boolean; conflict: boolean; error?: string }
   */
  public register(hotkey: string): { success: boolean; conflict: boolean; error?: string } {
    try {
      // Unregister previous if any
      if (this.currentHotkey) {
        try {
          globalShortcut.unregister(this.currentHotkey);
        } catch {
          // Ignore
        }
      }

      // Normalize hotkey string for Electron (e.g. 'CommandOrControl+Shift+S')
      let normalized = hotkey.trim();
      if (!normalized) {
        normalized = 'CommandOrControl+Shift+S';
      }

      // Test registration
      const success = globalShortcut.register(normalized, () => {
        if (this.onTriggerCallback) {
          this.onTriggerCallback();
        }
      });

      if (!success) {
        console.warn(`Global hotkey conflict: '${normalized}' is already registered by another application.`);
        return {
          success: false,
          conflict: true,
          error: `The hotkey '${normalized}' could not be registered because another application is already using it.`
        };
      }

      this.currentHotkey = normalized;
      return { success: true, conflict: false };
    } catch (err: any) {
      console.error('Error during global shortcut registration:', err);
      return {
        success: false,
        conflict: false,
        error: err?.message || 'Failed to register shortcut'
      };
    }
  }

  public unregisterCurrent(): void {
    if (this.currentHotkey) {
      try {
        globalShortcut.unregister(this.currentHotkey);
      } catch {
        // Ignore
      }
      this.currentHotkey = '';
    }
  }

  public unregisterAll(): void {
    try {
      globalShortcut.unregisterAll();
      this.currentHotkey = '';
    } catch (err) {
      console.error('Error unregistering all shortcuts:', err);
    }
  }

  public getCurrentHotkey(): string {
    return this.currentHotkey;
  }
}
