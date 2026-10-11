import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { CaptureToolbar, CaptureToolbarOptions } from './components/CaptureToolbar';
import { ScreenData, AppleCaptureMode } from '@shared/types';
import { Monitor, Square, Pause, Play, Mic, Folder, X, Check } from 'lucide-react';
import './styles/theme.css';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | null;

export const CaptureOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frozenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullResImageRef = useRef<HTMLImageElement | null>(null);
  const isExecutingActionRef = useRef<boolean>(false);

  // Video recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const recordingDurationRef = useRef<number>(0);
  const activeVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [allScreens, setAllScreens] = useState<ScreenData[]>([]);
  const [currentScreen, setCurrentScreen] = useState<ScreenData | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState<HandleType>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialRect, setInitialRect] = useState<Rect | null>(null);
  const [selectionColor, setSelectionColor] = useState('#ffffff');

  // Apple Capture & Recording state
  const [mode, setMode] = useState<AppleCaptureMode>('capture-portion');
  const [options, setOptions] = useState<CaptureToolbarOptions>({
    destination: 'clipboard',
    timer: 0,
    micEnabled: false
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<any>(null);

  // Live Screen Recording HUD state
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [savedVideoToast, setSavedVideoToast] = useState<{ filePath?: string; duration?: number } | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string>('crosshair');

  // Load a screen image onto the frozen canvas and retain the full-resolution source
  const loadScreenCanvas = useCallback((screenData: ScreenData) => {
    setCurrentScreen(screenData);
    setSelection(null);

    const frozenCanvas = document.createElement('canvas');
    frozenCanvas.width = screenData.bounds.width;
    frozenCanvas.height = screenData.bounds.height;
    const ctx = frozenCanvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      fullResImageRef.current = img;
      ctx.drawImage(img, 0, 0, screenData.bounds.width, screenData.bounds.height);
      frozenCanvasRef.current = frozenCanvas;
      redraw();
    };
    img.src = screenData.dataUrl;
  }, []);

  // Listen for capture displays payload AND pull on mount for guaranteed first-launch delivery
  useEffect(() => {
    if (!window.snapshotAPI) return;

    const handlePayload = (payload: any) => {
      if (!payload) return;
      const { activeDisplayId, screens, settings } = payload;
      setAllScreens(screens || []);
      setSelectionColor(settings?.selectionColor || '#ffffff');

      const active = (screens || []).find((s: ScreenData) => s.displayId === activeDisplayId) || (screens || [])[0];
      if (active) {
        loadScreenCanvas(active);
      }
    };

    const cleanup = window.snapshotAPI.onCaptureDisplays(handlePayload);

    // Initial pull in case the window loaded after payload was dispatched by main
    window.snapshotAPI.getCaptureDisplays().then((initialPayload) => {
      if (initialPayload) {
        handlePayload(initialPayload);
      }
    }).catch(() => {});

    return () => cleanup();
  }, [loadScreenCanvas]);

  // Switch to another monitor
  const handleSwitchDisplay = async (targetScreen: ScreenData) => {
    if (window.snapshotAPI) {
      await window.snapshotAPI.switchDisplay(targetScreen.bounds);
      loadScreenCanvas(targetScreen);
    }
  };

  // Redraw the selection overlay
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentScreen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the frozen desktop background
    if (frozenCanvasRef.current) {
      ctx.drawImage(frozenCanvasRef.current, 0, 0);
    }

    // Scrim treatment depends on mode: in full screen capture/record mode without selection, lighter scrim
    const isFullScreenMode = mode === 'capture-screen' || mode === 'record-screen';

    if (isFullScreenMode && (!selection || selection.width === 0)) {
      // Gentle vignette frame highlighting full screen capture
      ctx.fillStyle = 'rgba(10, 12, 16, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = mode === 'record-screen' ? '#ef4444' : selectionColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
      return;
    }

    // Draw dark scrim overlay
    ctx.fillStyle = isRecording ? 'rgba(0, 0, 0, 0.15)' : 'rgba(10, 12, 16, 0.48)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (selection && selection.width > 0 && selection.height > 0) {
      // Clear hole inside selection to reveal crisp underlying screen
      ctx.save();
      ctx.beginPath();
      ctx.rect(selection.x, selection.y, selection.width, selection.height);
      ctx.clip();

      if (frozenCanvasRef.current) {
        ctx.drawImage(frozenCanvasRef.current, 0, 0);
      }

      ctx.restore();

      // Selection border: red for recording, selectionColor for photo
      ctx.strokeStyle = isRecording || mode.startsWith('record') ? '#ef4444' : selectionColor;
      ctx.lineWidth = 2;

      if (isRecording) {
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
        ctx.setLineDash([]);
      } else {
        ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);

        // Draw 8 resize handles
        const handleSize = 8;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = selectionColor;
        ctx.lineWidth = 2;

        const corners = [
          { x: selection.x, y: selection.y }, // nw
          { x: selection.x + selection.width / 2, y: selection.y }, // n
          { x: selection.x + selection.width, y: selection.y }, // ne
          { x: selection.x + selection.width, y: selection.y + selection.height / 2 }, // e
          { x: selection.x + selection.width, y: selection.y + selection.height }, // se
          { x: selection.x + selection.width / 2, y: selection.y + selection.height }, // s
          { x: selection.x, y: selection.y + selection.height }, // sw
          { x: selection.x, y: selection.y + selection.height / 2 } // w
        ];

        corners.forEach((pt) => {
          ctx.fillRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
        });
      }
    }
  }, [selection, selectionColor, currentScreen, mode, isRecording]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Determine which resize handle the mouse is hovering over
  const getHandleAt = (x: number, y: number): HandleType => {
    if (!selection || isRecording || selection.width < 10 || selection.height < 10) return null;
    const threshold = 10;
    const { x: sx, y: sy, width: sw, height: sh } = selection;

    const near = (px: number, py: number) => Math.hypot(px - x, py - y) <= threshold;

    if (near(sx, sy)) return 'nw';
    if (near(sx + sw, sy)) return 'ne';
    if (near(sx + sw, sy + sh)) return 'se';
    if (near(sx, sy + sh)) return 'sw';
    if (near(sx + sw / 2, sy)) return 'n';
    if (near(sx + sw, sy + sh / 2)) return 'e';
    if (near(sx + sw / 2, sy + sh)) return 's';
    if (near(sx, sy + sh / 2)) return 'w';

    if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) {
      return 'move';
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isRecording) return; // Only left click

    // If the click occurred inside the toolbar, HUD, or interactive elements, ignore
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest(
        '.capture-toolbar-wrapper, .capture-toolbar, .monitor-switcher-pill, .top-recording-hud, .recording-toast, button, input, [data-no-capture="true"]'
      )
    ) {
      return;
    }

    const x = e.clientX;
    const y = e.clientY;

    if (selection && selection.width >= 10 && selection.height >= 10) {
      const handle = getHandleAt(x, y);
      if (handle) {
        setIsAdjusting(handle);
        setDragStart({ x, y });
        setInitialRect({ ...selection });
        return;
      }
    }

    // Start fresh selection
    setIsSelecting(true);
    setDragStart({ x, y });
    setSelection({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!currentScreen || isRecording) return;
    const x = e.clientX;
    const y = e.clientY;

    if (!isSelecting && !isAdjusting) {
      const handle = getHandleAt(x, y);
      if (handle === 'nw' || handle === 'se') setHoverCursor('nwse-resize');
      else if (handle === 'ne' || handle === 'sw') setHoverCursor('nesw-resize');
      else if (handle === 'n' || handle === 's') setHoverCursor('ns-resize');
      else if (handle === 'e' || handle === 'w') setHoverCursor('ew-resize');
      else if (handle === 'move') setHoverCursor('move');
      else setHoverCursor('crosshair');
    }

    if (isAdjusting && dragStart && initialRect) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      let newRect = { ...initialRect };

      if (isAdjusting === 'move') {
        newRect.x = Math.max(0, Math.min(initialRect.x + dx, currentScreen.bounds.width - initialRect.width));
        newRect.y = Math.max(0, Math.min(initialRect.y + dy, currentScreen.bounds.height - initialRect.height));
      } else if (isAdjusting === 'se') {
        newRect.width = Math.max(10, initialRect.width + dx);
        newRect.height = Math.max(10, initialRect.height + dy);
      } else if (isAdjusting === 'e') {
        newRect.width = Math.max(10, initialRect.width + dx);
      } else if (isAdjusting === 's') {
        newRect.height = Math.max(10, initialRect.height + dy);
      } else if (isAdjusting === 'nw') {
        const proposedW = initialRect.width - dx;
        const proposedH = initialRect.height - dy;
        if (proposedW >= 10) {
          newRect.x = initialRect.x + dx;
          newRect.width = proposedW;
        }
        if (proposedH >= 10) {
          newRect.y = initialRect.y + dy;
          newRect.height = proposedH;
        }
      } else if (isAdjusting === 'ne') {
        const proposedH = initialRect.height - dy;
        if (proposedH >= 10) {
          newRect.y = initialRect.y + dy;
          newRect.height = proposedH;
        }
        newRect.width = Math.max(10, initialRect.width + dx);
      } else if (isAdjusting === 'sw') {
        const proposedW = initialRect.width - dx;
        if (proposedW >= 10) {
          newRect.x = initialRect.x + dx;
          newRect.width = proposedW;
        }
        newRect.height = Math.max(10, initialRect.height + dy);
      } else if (isAdjusting === 'n') {
        const proposedH = initialRect.height - dy;
        if (proposedH >= 10) {
          newRect.y = initialRect.y + dy;
          newRect.height = proposedH;
        }
      } else if (isAdjusting === 'w') {
        const proposedW = initialRect.width - dx;
        if (proposedW >= 10) {
          newRect.x = initialRect.x + dx;
          newRect.width = proposedW;
        }
      }

      setSelection(newRect);
      return;
    }

    if (isSelecting && dragStart) {
      const clampedX = Math.max(0, Math.min(x, currentScreen.bounds.width));
      const clampedY = Math.max(0, Math.min(y, currentScreen.bounds.height));
      const left = Math.min(dragStart.x, clampedX);
      const top = Math.min(dragStart.y, clampedY);
      const width = Math.abs(clampedX - dragStart.x);
      const height = Math.abs(clampedY - dragStart.y);

      setSelection({ x: left, y: top, width, height });
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setIsAdjusting(null);
    setDragStart(null);
    setInitialRect(null);

    // Dismiss accidental tiny click without meaningful area
    setSelection((prev) => {
      if (prev && (prev.width < 10 || prev.height < 10)) {
        return null;
      }
      return prev;
    });
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting || isAdjusting) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, isAdjusting]);

  // Extract cropped image from the full-resolution physical image (Zero downsampling)
  const getCroppedImageDataUrl = (): { dataUrl: string; width: number; height: number } | null => {
    if (!currentScreen || !fullResImageRef.current) {
      return null;
    }

    const img = fullResImageRef.current;
    const scaleX = img.naturalWidth / currentScreen.bounds.width;
    const scaleY = img.naturalHeight / currentScreen.bounds.height;

    // If full screen mode or no selection made, crop the entire screen bounds
    const isFull = mode === 'capture-screen' || mode === 'capture-window' || !selection || selection.width < 10 || selection.height < 10;

    const sourceRect = isFull
      ? { x: 0, y: 0, width: currentScreen.bounds.width, height: currentScreen.bounds.height }
      : selection!;

    const cropPhysicalX = Math.round(sourceRect.x * scaleX);
    const cropPhysicalY = Math.round(sourceRect.y * scaleY);
    const cropPhysicalW = Math.max(1, Math.round(sourceRect.width * scaleX));
    const cropPhysicalH = Math.max(1, Math.round(sourceRect.height * scaleY));

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropPhysicalW;
    cropCanvas.height = cropPhysicalH;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      img,
      cropPhysicalX,
      cropPhysicalY,
      cropPhysicalW,
      cropPhysicalH,
      0,
      0,
      cropPhysicalW,
      cropPhysicalH
    );

    return {
      dataUrl: cropCanvas.toDataURL('image/png'),
      width: cropPhysicalW,
      height: cropPhysicalH
    };
  };

  // Screen Recording execution
  const startRecording = async () => {
    try {
      // Request desktop video stream (authorized by main process setDisplayMediaRequestHandler)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 60, max: 60 }
        },
        audio: false
      });

      let finalStream = displayStream;
      let recordWidth = currentScreen ? currentScreen.bounds.width : 1920;
      let recordHeight = currentScreen ? currentScreen.bounds.height : 1080;

      // If recording portion and valid selection exists, crop stream with canvas captureStream
      if (mode === 'record-portion' && selection && selection.width > 20 && selection.height > 20) {
        recordWidth = Math.round(selection.width);
        recordHeight = Math.round(selection.height);

        const video = document.createElement('video');
        video.srcObject = displayStream;
        video.muted = true;
        await video.play();
        activeVideoElementRef.current = video;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = recordWidth;
        cropCanvas.height = recordHeight;
        const cropCtx = cropCanvas.getContext('2d');

        const renderLoop = () => {
          if (!video.paused && !video.ended && cropCtx) {
            const scaleX = video.videoWidth / (currentScreen?.bounds.width || video.videoWidth);
            const scaleY = video.videoHeight / (currentScreen?.bounds.height || video.videoHeight);
            cropCtx.drawImage(
              video,
              selection.x * scaleX,
              selection.y * scaleY,
              selection.width * scaleX,
              selection.height * scaleY,
              0,
              0,
              recordWidth,
              recordHeight
            );
          }
          animationFrameIdRef.current = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        finalStream = (cropCanvas as any).captureStream(60);
      }

      // If microphone enabled, capture and blend audio
      if (options.micEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach((track) => finalStream.addTrack(track));
        } catch (micErr) {
          console.warn('Microphone unavailable, recording video without mic:', micErr);
        }
      }

      recordingStreamRef.current = displayStream;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 8000000
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Clean up stream tracks and render loop
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
        if (activeVideoElementRef.current) {
          activeVideoElementRef.current.pause();
          activeVideoElementRef.current.srcObject = null;
          activeVideoElementRef.current = null;
        }
        finalStream.getTracks().forEach((t) => t.stop());
        displayStream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunks, { type: 'video/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        if (window.snapshotAPI) {
          const res = await window.snapshotAPI.saveVideo({
            base64,
            duration: recordingDurationRef.current,
            width: recordWidth,
            height: recordHeight
          });

          if (res?.success) {
            setSavedVideoToast({
              filePath: res.filePath,
              duration: recordingDurationRef.current
            });
          }
        }
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          recordingDurationRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start screen recording:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (isRecordingPaused) {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
    }
  };

  // Unified Action Dispatcher with Debounce Protection
  const executeAction = useCallback(
    async (action: 'copy' | 'editor' | 'save' | 'pin' | 'cancel') => {
      if (isExecutingActionRef.current) return;
      isExecutingActionRef.current = true;

      try {
        if (action === 'cancel') {
          if (isRecording) {
            stopRecording();
          } else if (countdown !== null) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            setCountdown(null);
          } else if (window.snapshotAPI) {
            await window.snapshotAPI.cancelCapture();
          }
          return;
        }

        const cropped = getCroppedImageDataUrl();
        if (!cropped) {
          isExecutingActionRef.current = false;
          return;
        }

        if (!window.snapshotAPI) return;

        switch (action) {
          case 'copy':
            await window.snapshotAPI.quickCopy(cropped);
            break;
          case 'editor':
            await window.snapshotAPI.openEditor(cropped);
            break;
          case 'save':
            await window.snapshotAPI.saveCapture(cropped);
            break;
          case 'pin':
            await window.snapshotAPI.pinCapture(cropped);
            break;
        }
      } catch (err) {
        console.error(`Failed to execute capture action ${action}:`, err);
      } finally {
        setTimeout(() => {
          isExecutingActionRef.current = false;
        }, 300);
      }
    },
    [getCroppedImageDataUrl, isRecording, stopRecording, countdown]
  );

  // Trigger Action with optional Timer countdown
  const triggerCaptureOrRecord = useCallback(() => {
    const isVideo = mode === 'record-screen' || mode === 'record-portion';

    const runActionNow = () => {
      if (isVideo) {
        startRecording();
      } else {
        switch (options.destination) {
          case 'clipboard':
            executeAction('copy');
            break;
          case 'editor':
            executeAction('editor');
            break;
          case 'pin':
            executeAction('pin');
            break;
          case 'folder':
          default:
            executeAction('save');
            break;
        }
      }
    };

    if (options.timer > 0) {
      setCountdown(options.timer);
      let count = options.timer;
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          setCountdown(null);
          runActionNow();
        } else {
          setCountdown(count);
        }
      }, 1000);
    } else {
      runActionNow();
    }
  }, [mode, options, executeAction]);

  // Cycle to next display
  const handleSwitchNextDisplay = useCallback(() => {
    if (allScreens.length <= 1) return;
    const currentIdx = allScreens.findIndex((s) => s.displayId === currentScreen?.displayId);
    const nextIdx = (currentIdx + 1) % allScreens.length;
    handleSwitchDisplay(allScreens[nextIdx]);
  }, [allScreens, currentScreen]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else if (countdown !== null) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setCountdown(null);
        } else {
          executeAction('cancel');
        }
      } else if (e.key === 'Tab' && allScreens.length > 1 && !isSelecting && !isRecording) {
        e.preventDefault();
        handleSwitchNextDisplay();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!isRecording && countdown === null) {
          triggerCaptureOrRecord();
        }
      } else if (!isRecording && countdown === null) {
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          executeAction('editor');
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          executeAction('save');
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          executeAction('pin');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, allScreens, currentScreen, executeAction, isSelecting, handleSwitchNextDisplay, isRecording, countdown, triggerCaptureOrRecord, stopRecording]);

  if (!currentScreen) {
    return null;
  }

  const { width: scrW, height: scrH } = currentScreen.bounds;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: `${scrW}px`,
        height: `${scrH}px`,
        cursor: isRecording ? 'default' : isSelecting ? 'crosshair' : hoverCursor,
        overflow: 'hidden'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        width={scrW}
        height={scrH}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Multi-Monitor Switcher Floating Pill (when not recording and no active drag) */}
      {!isRecording && !selection && (
        <div
          className="monitor-switcher-pill"
          data-no-capture="true"
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            backgroundColor: 'rgba(24, 26, 30, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 20,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 10000,
            pointerEvents: 'auto',
            userSelect: 'none'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {allScreens.length > 1 ? (
            <>
              {allScreens.map((s, idx) => {
                const isActive = s.displayId === currentScreen.displayId;
                return (
                  <button
                    key={s.displayId}
                    type="button"
                    data-no-capture="true"
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwitchDisplay(s);
                    }}
                    className={isActive ? 'primary' : 'ghost'}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 14,
                      fontSize: 11,
                      fontWeight: 600,
                      gap: 5,
                      cursor: 'pointer'
                    }}
                    title={`Switch capture target to Display ${idx + 1}`}
                  >
                    <Monitor size={12} />
                    <span>
                      Display {idx + 1} ({s.bounds.width}×{s.bounds.height})
                    </span>
                    {isActive && <span style={{ fontSize: 9, opacity: 0.8 }}>(Active)</span>}
                  </button>
                );
              })}
              <span style={{ fontSize: 10, color: '#94a3b8', padding: '0 4px' }}>Tab to switch</span>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 11, fontWeight: 500 }}>
              <Monitor size={13} color="#ffffff" />
              <span>Display 1 ({currentScreen.bounds.width}×{currentScreen.bounds.height})</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>(Single monitor active)</span>
            </div>
          )}
        </div>
      )}

      {/* Live Dimension readout badge */}
      {!isRecording && selection && selection.width > 0 && selection.height > 0 && (
        <div
          style={{
            position: 'absolute',
            left: `${selection.x}px`,
            top: `${Math.max(8, selection.y - 26)}px`,
            backgroundColor: 'rgba(24, 26, 30, 0.94)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#f3f4f6',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          {Math.round(selection.width)} × {Math.round(selection.height)} px
        </div>
      )}

      {/* COUNTDOWN TIMER OVERLAY */}
      {countdown !== null && (
        <div
          data-no-capture="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: 'rgba(24, 26, 30, 0.85)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
            zIndex: 10005,
            pointerEvents: 'none'
          }}
        >
          <span style={{ fontSize: '42px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
            {countdown}
          </span>
          <span style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>Esc to cancel</span>
        </div>
      )}

      {/* ACTIVE SCREEN RECORDING TOP HUD PILL */}
      {isRecording && (
        <div
          className="top-recording-hud"
          data-no-capture="true"
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 14px',
            backgroundColor: 'rgba(24, 26, 30, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '20px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
            zIndex: 10001,
            pointerEvents: 'auto',
            userSelect: 'none'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Recording indicator dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isRecordingPaused ? '#eab308' : '#ef4444',
                boxShadow: isRecordingPaused ? 'none' : '0 0 8px rgba(239, 68, 68, 0.8)'
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: isRecordingPaused ? '#eab308' : '#ef4444'
              }}
            >
              {isRecordingPaused ? 'PAUSED' : 'REC'}
            </span>
          </div>

          {/* Time Counter */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#f3f4f6'
            }}
          >
            {formatDuration(recordingDuration)}
          </span>

          {/* Mic indicator */}
          {options.micEnabled && (
            <div style={{ display: 'flex', alignItems: 'center' }} title="Microphone Active">
              <Mic size={13} color="#ffffff" />
            </div>
          )}

          <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.14)' }} />

          {/* Pause / Resume */}
          <button
            type="button"
            data-no-capture="true"
            onClick={togglePauseRecording}
            className="ghost"
            title={isRecordingPaused ? 'Resume Recording' : 'Pause Recording'}
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              color: '#f3f4f6',
              border: 'none',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {isRecordingPaused ? <Play size={12} /> : <Pause size={12} />}
            <span>{isRecordingPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Stop Button */}
          <button
            type="button"
            data-no-capture="true"
            onClick={stopRecording}
            className="danger"
            title="Stop Screen Recording (Esc or click)"
            style={{
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
            }}
          >
            <Square size={10} fill="#ffffff" />
            <span>Stop</span>
          </button>
        </div>
      )}

      {/* RECORDING SAVED CONFIRMATION TOAST */}
      {savedVideoToast && (
        <div
          className="recording-toast"
          data-no-capture="true"
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            backgroundColor: 'rgba(24, 26, 30, 0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
            zIndex: 10005,
            pointerEvents: 'auto',
            userSelect: 'none'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Check size={18} color="#10b981" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>
              Screen Recording Saved
            </span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              Duration: {formatDuration(savedVideoToast.duration || 0)} • WebM
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
            {savedVideoToast.filePath && (
              <button
                type="button"
                data-no-capture="true"
                onClick={() => {
                  if (savedVideoToast.filePath && window.snapshotAPI) {
                    window.snapshotAPI.showInFolder(savedVideoToast.filePath);
                  }
                }}
                className="ghost"
                style={{
                  padding: '5px 9px',
                  borderRadius: '7px',
                  fontSize: '11px',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
                title="Show in Windows Explorer"
              >
                <Folder size={13} />
                <span>Show in Folder</span>
              </button>
            )}

            <button
              type="button"
              data-no-capture="true"
              onClick={() => {
                setSavedVideoToast(null);
                if (window.snapshotAPI) {
                  window.snapshotAPI.cancelCapture();
                }
              }}
              className="ghost"
              style={{
                padding: '5px 7px',
                borderRadius: '7px',
                color: '#9ca3af',
                cursor: 'pointer'
              }}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* FLOATING APPLE COMMAND+SHIFT+5 ACTION DOCK */}
      {!isRecording && !savedVideoToast && (
        <div className="capture-toolbar-wrapper" data-no-capture="true">
          <CaptureToolbar
            selection={selection}
            virtualBounds={{ width: scrW, height: scrH }}
            allScreens={allScreens}
            currentScreenId={currentScreen.displayId}
            mode={mode}
            onModeChange={setMode}
            options={options}
            onOptionsChange={setOptions}
            onAction={triggerCaptureOrRecord}
            onSwitchDisplay={allScreens.length > 1 ? handleSwitchNextDisplay : undefined}
            onQuickCopy={() => executeAction('copy')}
            onOpenEditor={() => executeAction('editor')}
            onSave={() => executeAction('save')}
            onPin={() => executeAction('pin')}
            onCancel={() => executeAction('cancel')}
            isRecording={isRecording}
          />
        </div>
      )}
    </div>
  );
};

const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null;
if (rootElement) {
  ReactDOM.createRoot(rootElement as HTMLElement).render(
    <React.StrictMode>
      <CaptureOverlay />
    </React.StrictMode>
  );
}

