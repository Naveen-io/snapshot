import { screen, desktopCapturer, nativeImage } from 'electron';
import { ScreenData, WindowCaptureTarget } from '../shared/types';

export class CaptureEngine {
  /**
   * Captures visual state for all attached displays with exact native resolution per display.
   */
  public async captureAllScreens(): Promise<{
    activeDisplayId: number;
    screens: ScreenData[];
  }> {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const cursorPoint = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursorPoint);

    const screensData: ScreenData[] = [];

    // Capture each display at its exact native physical resolution (1:1 pixel match, no upscaling/downsampling)
    for (let i = 0; i < displays.length; i++) {
      const display = displays[i];
      const targetW = Math.round(display.bounds.width * (display.scaleFactor || 1));
      const targetH = Math.round(display.bounds.height * (display.scaleFactor || 1));

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: targetW,
          height: targetH
        },
        fetchWindowIcons: false
      });

      let matched = sources.find(
        (s) => s.display_id === String(display.id) || s.id.includes(String(display.id))
      );

      if (!matched && sources.length > i) {
        matched = sources[i];
      } else if (!matched && sources.length > 0) {
        matched = sources[0];
      }

      if (matched && !matched.thumbnail.isEmpty()) {
        screensData.push({
          displayId: display.id,
          bounds: display.bounds,
          dataUrl: matched.thumbnail.toDataURL(),
          scaleFactor: display.scaleFactor || 1,
          isPrimary: display.id === primary.id,
          isActive: display.id === activeDisplay.id
        });
      }
    }

    return {
      activeDisplayId: activeDisplay.id,
      screens: screensData
    };
  }

  /**
   * Captures the primary display directly.
   */
  public async capturePrimaryScreen(): Promise<{ dataUrl: string; width: number; height: number }> {
    const primary = screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: primary.size.width * primary.scaleFactor,
        height: primary.size.height * primary.scaleFactor
      }
    });

    const source = sources[0];
    if (!source) {
      throw new Error('No screen capture source available');
    }

    const size = source.thumbnail.getSize();
    return {
      dataUrl: source.thumbnail.toDataURL(),
      width: size.width,
      height: size.height
    };
  }

  /**
   * Lists available application windows.
   */
  public async getAvailableWindows(): Promise<WindowCaptureTarget[]> {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 640, height: 360 },
      fetchWindowIcons: true
    });

    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
      appIcon: s.appIcon ? s.appIcon.toDataURL() : undefined
    }));
  }

  /**
   * Extracts a cropped region from a base64 dataUrl image.
   */
  public cropRegion(
    dataUrl: string,
    rect: { x: number; y: number; width: number; height: number }
  ): { dataUrl: string; width: number; height: number } {
    const image = nativeImage.createFromDataURL(dataUrl);
    const imgSize = image.getSize();

    const safeX = Math.max(0, Math.min(rect.x, imgSize.width - 1));
    const safeY = Math.max(0, Math.min(rect.y, imgSize.height - 1));
    const safeWidth = Math.max(1, Math.min(rect.width, imgSize.width - safeX));
    const safeHeight = Math.max(1, Math.min(rect.height, imgSize.height - safeY));

    const cropped = image.crop({
      x: Math.round(safeX),
      y: Math.round(safeY),
      width: Math.round(safeWidth),
      height: Math.round(safeHeight)
    });

    const croppedSize = cropped.getSize();
    return {
      dataUrl: cropped.toDataURL(),
      width: croppedSize.width,
      height: croppedSize.height
    };
  }
}
