import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation, CompositionSettings, ToolType, Point, RedactionStyle, StampType } from '@shared/types';
import { ColorPickerLoupe, rgbToHex } from './ColorPickerLoupe';
import { Trash2, Copy, Edit3, Bold, Type, Sparkles, Check } from 'lucide-react';

interface EditorCanvasProps {
  baseImage: HTMLImageElement | null;
  annotations: Annotation[];
  onUpdateAnnotations: (newAnnotations: Annotation[]) => void;
  currentTool: ToolType;
  selectedColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  hasBackground?: boolean;
  redactionStyle: RedactionStyle;
  stampType: StampType;
  magnification: number;
  composition: CompositionSettings;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onShowToast: (msg: string) => void;
  exportTriggerRef?: React.MutableRefObject<((format?: string, quality?: number) => string) | null>;
  showGrid?: boolean;
  gridSpacing?: number;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  baseImage,
  annotations,
  onUpdateAnnotations,
  currentTool,
  selectedColor,
  strokeWidth,
  fontSize,
  fontFamily = 'sans-serif',
  fontWeight = 'bold',
  hasBackground = false,
  redactionStyle,
  stampType,
  magnification,
  composition,
  rotation,
  flipH,
  flipV,
  zoom,
  onZoomChange,
  selectedAnnotationId,
  onSelectAnnotation,
  onShowToast,
  exportTriggerRef,
  showGrid = false,
  gridSpacing = 20
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const activeAnnotationRef = useRef<Annotation | null>(null);
  const pendingMouseCoords = useRef<{ clientX: number; clientY: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Live mouse coordinates for precision inspector
  const [mouseCanvasCoords, setMouseCanvasCoords] = useState<Point | null>(null);

  // Interactive Drag & Resize for selected annotations
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [initialAnnState, setInitialAnnState] = useState<Annotation | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const [currentTextVal, setCurrentTextVal] = useState<string>('');
  const [editingTextAnnId, setEditingTextAnnId] = useState<string | null>(null);

  // Color picker state
  const [loupeColor, setLoupeColor] = useState<{ r: number; g: number; b: number; a: number } | null>(null);
  const [loupeScreenPos, setLoupeScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isLoupePinned, setIsLoupePinned] = useState<boolean>(false);

  // Calculate rotated and flipped dimensions
  const getRotatedDimensions = () => {
    if (!baseImage) return { width: 800, height: 600 };
    const isSideways = rotation % 180 !== 0;
    return {
      width: isSideways ? baseImage.naturalHeight : baseImage.naturalWidth,
      height: isSideways ? baseImage.naturalWidth : baseImage.naturalHeight
    };
  };

  const getCanvasDimensions = () => {
    const { width: imgW, height: imgH } = getRotatedDimensions();
    const frameHeaderHeight = composition.frameType !== 'none' ? 32 : 0;
    const pad = composition.padding;
    return {
      canvasWidth: imgW + pad * 2,
      canvasHeight: imgH + pad * 2 + frameHeaderHeight,
      imgX: pad,
      imgY: pad + frameHeaderHeight,
      imgW,
      imgH
    };
  };

  const clientToCanvasCoords = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Main canvas render routine
  const renderCanvas = useCallback(
    (targetCanvas?: HTMLCanvasElement, sanitizeRedaction: boolean = false): void => {
      const canvas = targetCanvas || canvasRef.current;
      if (!canvas || !baseImage) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { canvasWidth, canvasHeight, imgX, imgY, imgW, imgH } = getCanvasDimensions();
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // 1. Draw Background
      if (composition.backgroundType === 'solid') {
        ctx.fillStyle = composition.backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else if (composition.backgroundType === 'gradient') {
        const rad = (composition.gradientAngle * Math.PI) / 180;
        const x2 = canvasWidth * Math.cos(rad);
        const y2 = canvasHeight * Math.sin(rad);
        const grad = ctx.createLinearGradient(0, 0, x2, y2);

        const stops = composition.gradientStops && composition.gradientStops.length > 1
          ? composition.gradientStops
          : [composition.gradientFrom, composition.gradientTo];

        stops.forEach((color, idx) => {
          grad.addColorStop(idx / (stops.length - 1), color);
        });

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Ambient Halo Glow in center behind screenshot
        if (composition.showHalo) {
          ctx.save();
          const haloGrad = ctx.createRadialGradient(
            canvasWidth / 2,
            canvasHeight / 2,
            Math.min(imgW, imgH) * 0.2,
            canvasWidth / 2,
            canvasHeight / 2,
            Math.max(canvasWidth, canvasHeight) * 0.65
          );
          haloGrad.addColorStop(0, composition.haloColor || 'rgba(236, 72, 153, 0.45)');
          haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = haloGrad;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          ctx.restore();
        }
      }

      // 2. Decorative Dot or Grid Pattern
      if (composition.showPattern && composition.patternType !== 'none') {
        ctx.save();
        if (composition.patternType === 'dots') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          const spacing = 20;
          for (let x = spacing / 2; x < canvasWidth; x += spacing) {
            for (let y = spacing / 2; y < canvasHeight; y += spacing) {
              ctx.beginPath();
              ctx.arc(x, y, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (composition.patternType === 'grid') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.lineWidth = 1;
          const spacing = 32;
          for (let x = 0; x < canvasWidth; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
          }
          for (let y = 0; y < canvasHeight; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 3. Drop Shadow around container
      if (composition.shadowBlur > 0 && composition.padding > 0) {
        ctx.save();
        ctx.shadowColor = composition.shadowColor;
        ctx.shadowBlur = composition.shadowBlur;
        ctx.shadowOffsetY = composition.shadowOffsetY;
        ctx.fillStyle = '#000000';
        drawRoundedRectPath(
          ctx,
          imgX,
          imgY - (composition.frameType !== 'none' ? 32 : 0),
          imgW,
          imgH + (composition.frameType !== 'none' ? 32 : 0),
          composition.borderRadius
        );
        ctx.fill();
        ctx.restore();
      }

      // 4. Window Header Frame Mockup
      if (composition.frameType !== 'none') {
        const frameH = 32;
        const frameY = imgY - frameH;
        ctx.save();
        ctx.fillStyle = '#1c202c';
        drawRoundedRectPath(ctx, imgX, frameY, imgW, frameH + composition.borderRadius, composition.borderRadius);
        ctx.fill();

        if (composition.frameType === 'macos') {
          const dots = [
            { x: imgX + 16, color: '#ff5f56' },
            { x: imgX + 32, color: '#ffbd2e' },
            { x: imgX + 48, color: '#27c93f' }
          ];
          dots.forEach((dot) => {
            ctx.beginPath();
            ctx.arc(dot.x, frameY + frameH / 2, 5, 0, Math.PI * 2);
            ctx.fillStyle = dot.color;
            ctx.fill();
          });
        } else if (composition.frameType === 'windows') {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          const rx = imgX + imgW - 48;
          ctx.beginPath();
          ctx.moveTo(rx + 24, frameY + 12);
          ctx.lineTo(rx + 32, frameY + 20);
          ctx.moveTo(rx + 32, frameY + 12);
          ctx.lineTo(rx + 24, frameY + 20);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5. Base Screenshot
      ctx.save();
      if (composition.borderRadius > 0) {
        drawRoundedRectPath(ctx, imgX, imgY, imgW, imgH, composition.borderRadius);
        ctx.clip();
      }

      ctx.translate(imgX + imgW / 2, imgY + imgH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      const isSideways = rotation % 180 !== 0;
      const dw = isSideways ? imgH : imgW;
      const dh = isSideways ? imgW : imgH;
      ctx.drawImage(baseImage, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();

      // 6. Annotations
      const allAnnotations = [...annotations];
      if (activeAnnotation) {
        allAnnotations.push(activeAnnotation);
      }

      // Render Redactions & Spotlight
      allAnnotations.forEach((ann) => {
        const normX = Math.min(ann.x, ann.x + ann.width);
        const normY = Math.min(ann.y, ann.y + ann.height);
        const normW = Math.abs(ann.width);
        const normH = Math.abs(ann.height);
        const isLive = Boolean(activeAnnotation && ann.id === activeAnnotation.id);

        if (ann.type === 'redact') {
          if (normW <= 0 || normH <= 0) return;
          const style = ann.redactionStyle || 'blur';

          if (isLive) {
            // Live interaction preview: dashed box without expensive processing
            ctx.save();
            ctx.fillStyle = style === 'blackout' ? 'rgba(9, 10, 13, 0.75)' : 'rgba(255, 255, 255, 0.08)';
            drawRoundedRectPath(ctx, normX, normY, normW, normH, 4);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
            return;
          }

          if (style === 'blackout') {
            ctx.save();
            if (sanitizeRedaction) {
              // 100% destructive hard blackout on export
              ctx.fillStyle = '#000000';
              ctx.fillRect(normX, normY, normW, normH);
            } else {
              // Sleek matte obsidian bar in editor
              ctx.fillStyle = '#090a0d';
              drawRoundedRectPath(ctx, normX, normY, normW, normH, 4);
              ctx.fill();
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            ctx.restore();
          } else if (style === 'pixelate') {
            fastPixelateRegion(ctx, normX, normY, normW, normH, 14);
          } else {
            // Frosted blur
            fastBlurRegion(ctx, normX, normY, normW, normH, 14);
          }
        } else if (ann.type === 'blur') {
          if (normW <= 0 || normH <= 0) return;
          if (isLive) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            drawRoundedRectPath(ctx, normX, normY, normW, normH, 4);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
            return;
          }
          fastPixelateRegion(ctx, normX, normY, normW, normH, ann.blurRadius || 12);
        } else if (ann.type === 'spotlight') {
          if (normW > 2 && normH > 2) {
            ctx.save();
            ctx.beginPath();
            // Dim screenshot area
            ctx.rect(imgX, imgY, imgW, imgH);
            // Cutout spotlight area
            drawRoundedRectPath(ctx, normX, normY, normW, normH, 6);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fill('evenodd');

            // Spot border
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            drawRoundedRectPath(ctx, normX, normY, normW, normH, 6);
            ctx.stroke();
            ctx.restore();
          }
        }
      });

      // Render Vector & Callout Annotations
      allAnnotations.forEach((ann) => {
        if (['redact', 'blur', 'spotlight'].includes(ann.type)) return;

        const normX = Math.min(ann.x, ann.x + ann.width);
        const normY = Math.min(ann.y, ann.y + ann.height);
        const normW = Math.abs(ann.width);
        const normH = Math.abs(ann.height);

        ctx.save();
        ctx.strokeStyle = ann.color;
        ctx.fillStyle = ann.fillColor || ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (ann.type === 'arrow') {
          drawArrow(ctx, ann.x, ann.y, ann.x + ann.width, ann.y + ann.height, ann.strokeWidth);
        } else if (ann.type === 'line') {
          ctx.beginPath();
          ctx.moveTo(ann.x, ann.y);
          ctx.lineTo(ann.x + ann.width, ann.y + ann.height);
          ctx.stroke();
        } else if (ann.type === 'rect') {
          ctx.strokeRect(normX, normY, normW, normH);
        } else if (ann.type === 'rounded-rect') {
          drawRoundedRectPath(ctx, normX, normY, normW, normH, 8);
          ctx.stroke();
        } else if (ann.type === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(
            normX + normW / 2,
            normY + normH / 2,
            Math.abs(normW / 2),
            Math.abs(normH / 2),
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        } else if (ann.type === 'pen' && ann.points && ann.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y);
          }
          ctx.stroke();
        } else if (ann.type === 'highlighter' && ann.points && ann.points.length > 1) {
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = ann.strokeWidth * 3;
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y);
          }
          ctx.stroke();
        } else if (ann.type === 'text') {
          ctx.save();
          const fWeight = ann.fontWeight || 'bold';
          const fSize = ann.fontSize || 18;
          const fFam = ann.fontFamily || 'Segoe UI, sans-serif';
          ctx.font = `${fWeight} ${fSize}px ${fFam}`;
          ctx.textBaseline = 'top';
          const lineHeight = fSize * 1.35;
          const lines = (ann.text || '').split('\n');

          // Subtle background pill badge if enabled
          if (ann.hasBackground) {
            let maxW = 0;
            lines.forEach((l) => {
              const m = ctx.measureText(l);
              if (m.width > maxW) maxW = m.width;
            });
            const textBgW = maxW + 16;
            const textBgH = lines.length * lineHeight + 8;
            ctx.fillStyle = ann.backgroundColor || 'rgba(15, 23, 42, 0.88)';
            drawRoundedRectPath(ctx, ann.x - 8, ann.y - 4, textBgW, textBgH, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          ctx.fillStyle = ann.color;
          lines.forEach((line, idx) => {
            ctx.fillText(line, ann.x, ann.y + idx * lineHeight);
          });
          ctx.restore();
        } else if (ann.type === 'callout') {
          // Rounded speech bubble
          drawSpeechBubble(
            ctx,
            normX,
            normY,
            normW,
            normH,
            ann.text || '',
            ann.color,
            ann.fontSize || 14,
            ann.strokeWidth || 2,
            ann.fillColor
          );
        } else if (ann.type === 'step') {
          const radius = 16;
          ctx.beginPath();
          ctx.arc(ann.x, ann.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = ann.color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(ann.stepNumber || 1), ann.x, ann.y);
        } else if (ann.type === 'stamp') {
          // Render stamp badge (Check, Cross, Warning, Star, Heart, Question)
          drawStampBadge(ctx, ann.x, ann.y, ann.stampType || 'check');
        } else if (ann.type === 'loupe-annotation') {
          // Magnifier Zoom Callout: circles an area and renders it magnified at 2x
          drawMagnifierLoupe(ctx, canvas, ann.x, ann.y, Math.max(36, Math.abs(ann.width)), ann.magnification || 2);
        } else if (ann.imageDataUrl) {
          const cachedImg = imageCacheRef.current[ann.id];
          if (cachedImg) {
            ctx.drawImage(cachedImg, normX, normY, normW, normH);
          } else {
            const img = new Image();
            img.onload = () => {
              imageCacheRef.current[ann.id] = img;
              renderCanvas();
            };
            img.src = ann.imageDataUrl;
          }
        }

        // Selection indicator with 4 corner resize handles
        if (ann.id === selectedAnnotationId) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(normX - 4, normY - 4, normW + 8, normH + 8);
          ctx.setLineDash([]);

          // 4 corner handles
          const handleSize = 7;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.lineWidth = 1.5;

          const handles = [
            { x: normX - 4, y: normY - 4 }, // nw
            { x: normX + normW + 4, y: normY - 4 }, // ne
            { x: normX + normW + 4, y: normY + normH + 4 }, // se
            { x: normX - 4, y: normY + normH + 4 } // sw
          ];

          handles.forEach((h) => {
            ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
          });
        }

        ctx.restore();
      });

      // 7. Watermark Tag if enabled
      if (composition.showWatermark && composition.watermarkText) {
        ctx.save();
        ctx.font = '600 12px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.textAlign = 'right';
        ctx.fillText(composition.watermarkText, canvasWidth - 16, canvasHeight - 14);
        ctx.restore();
      }

      // 8. Non-destructive editing grid overlay (only drawn for live editor, not on export)
      if (showGrid && (!targetCanvas || targetCanvas === canvasRef.current)) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        const sp = gridSpacing || 20;
        for (let x = 0; x <= canvasWidth; x += sp) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasHeight);
          ctx.stroke();
        }
        for (let y = 0; y <= canvasHeight; y += sp) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvasWidth, y);
          ctx.stroke();
        }
        ctx.restore();
      }
    },
    [
      baseImage,
      annotations,
      activeAnnotation,
      composition,
      rotation,
      flipH,
      flipV,
      selectedAnnotationId,
      redactionStyle,
      showGrid,
      gridSpacing
    ]
  );

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Export trigger ref
  useEffect(() => {
    if (exportTriggerRef) {
      exportTriggerRef.current = (format: string = 'png', quality: number = 95) => {
        const offCanvas = document.createElement('canvas');
        renderCanvas(offCanvas, true);
        const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        return offCanvas.toDataURL(mime, quality / 100);
      };
    }
  }, [exportTriggerRef, renderCanvas]);

  // Helpers
  function drawRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) {
    const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    width: number
  ) {
    const dist = Math.hypot(toX - fromX, toY - fromY);
    if (dist < 4) return;
    const headLength = Math.max(14, Math.min(36, width * 3.4));
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    // Smooth line shaft stopping just inside head
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX - headLength * 0.4 * Math.cos(angle), toY - headLength * 0.4 * Math.sin(angle));
    ctx.stroke();

    // Sleek sculpted arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - 0.45), toY - headLength * Math.sin(angle - 0.45));
    ctx.lineTo(toX - headLength * 0.65 * Math.cos(angle), toY - headLength * 0.65 * Math.sin(angle));
    ctx.lineTo(toX - headLength * Math.cos(angle + 0.45), toY - headLength * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
  }

  function fastPixelateRegion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    pixelSize: number = 14
  ) {
    if (w <= 0 || h <= 0) return;
    const normX = Math.round(x);
    const normY = Math.round(y);
    const normW = Math.round(w);
    const normH = Math.round(h);
    if (normW <= 0 || normH <= 0) return;

    try {
      const blockSize = Math.max(4, pixelSize);
      const smallW = Math.max(1, Math.floor(normW / blockSize));
      const smallH = Math.max(1, Math.floor(normH / blockSize));

      const off = document.createElement('canvas');
      off.width = smallW;
      off.height = smallH;
      const offCtx = off.getContext('2d');
      if (!offCtx) return;

      // Downscale onto small offscreen canvas (box sampling)
      offCtx.drawImage(ctx.canvas, normX, normY, normW, normH, 0, 0, smallW, smallH);

      // Upscale back with nearest-neighbor (hardware accelerated pixelate)
      ctx.save();
      ctx.beginPath();
      drawRoundedRectPath(ctx, normX, normY, normW, normH, 4);
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, smallW, smallH, normX, normY, normW, normH);

      // Clean hairline perimeter
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    } catch {
      // Ignore boundary errors
    }
  }

  function fastBlurRegion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number = 14
  ) {
    if (w <= 0 || h <= 0) return;
    const normX = Math.round(x);
    const normY = Math.round(y);
    const normW = Math.round(w);
    const normH = Math.round(h);
    if (normW <= 0 || normH <= 0) return;

    try {
      const margin = Math.round(radius * 1.5);
      const srcX = Math.max(0, normX - margin);
      const srcY = Math.max(0, normY - margin);
      const srcW = Math.min(ctx.canvas.width - srcX, normW + margin * 2);
      const srcH = Math.min(ctx.canvas.height - srcY, normH + margin * 2);

      const off = document.createElement('canvas');
      off.width = srcW;
      off.height = srcH;
      const offCtx = off.getContext('2d');
      if (!offCtx) return;

      offCtx.drawImage(ctx.canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

      ctx.save();
      ctx.beginPath();
      drawRoundedRectPath(ctx, normX, normY, normW, normH, 4);
      ctx.clip();
      ctx.filter = `blur(${Math.max(4, radius)}px)`;
      ctx.drawImage(off, 0, 0, srcW, srcH, srcX, srcY, srcW, srcH);
      ctx.filter = 'none';

      // Frosted glass inner tint & subtle hairline perimeter
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    } catch {
      // Fallback to fast pixelation if canvas filter not supported
      fastPixelateRegion(ctx, normX, normY, normW, normH, 16);
    }
  }

  function drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: string,
    fontSz: number,
    strokeW: number = 2,
    fillCol?: string
  ) {
    const bubbleW = Math.max(60, w);
    const bubbleH = Math.max(36, h);
    const r = Math.min(10, bubbleW / 6, bubbleH / 6);
    const tailW = Math.min(24, Math.max(12, bubbleW * 0.2));
    const tailH = Math.min(20, Math.max(12, bubbleH * 0.3));

    ctx.save();
    ctx.fillStyle = fillCol || 'rgba(28, 34, 51, 0.95)';
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeW;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Bubble path with attached bottom tail
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + bubbleW - r, y);
    ctx.quadraticCurveTo(x + bubbleW, y, x + bubbleW, y + r);
    ctx.lineTo(x + bubbleW, y + bubbleH - r);
    ctx.quadraticCurveTo(x + bubbleW, y + bubbleH, x + bubbleW - r, y + bubbleH);

    // Integrated bottom pointer tail
    const tailStartX = x + Math.min(36, bubbleW * 0.3);
    ctx.lineTo(tailStartX + tailW, y + bubbleH);
    ctx.lineTo(tailStartX, y + bubbleH + tailH);
    ctx.lineTo(tailStartX + tailW * 0.4, y + bubbleH);

    ctx.lineTo(x + r, y + bubbleH);
    ctx.quadraticCurveTo(x, y + bubbleH, x, y + bubbleH - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSz}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const lineHeight = fontSz * 1.35;
      const lines = text.split('\n');
      lines.forEach((line, idx) => {
        ctx.fillText(line, x + 10, y + 8 + idx * lineHeight);
      });
    }
    ctx.restore();
  }

  function drawStampBadge(ctx: CanvasRenderingContext2D, x: number, y: number, type: StampType) {
    const r = 16;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);

    let bg = '#10b981';
    let symbol = '✓';
    if (type === 'cross') {
      bg = '#ef4444';
      symbol = '✕';
    } else if (type === 'warning') {
      bg = '#f59e0b';
      symbol = '!';
    } else if (type === 'star') {
      bg = '#eab308';
      symbol = '★';
    } else if (type === 'heart') {
      bg = '#ec4899';
      symbol = '♥';
    } else if (type === 'question') {
      bg = '#06b6d4';
      symbol = '?';
    }

    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x, y);
    ctx.restore();
  }

  function drawMagnifierLoupe(
    ctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    x: number,
    y: number,
    radius: number,
    mag: number
  ) {
    if (!sourceCanvas) return;
    ctx.save();

    // Source area centered around x, y
    const srcW = (radius * 2) / mag;
    const srcH = (radius * 2) / mag;
    const srcX = x - srcW / 2;
    const srcY = y - srcH / 2;

    // Draw magnified content clipped to circular loupe
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(sourceCanvas, srcX, srcY, srcW, srcH, x - radius, y - radius, radius * 2, radius * 2);

    // Loupe Border & crosshairs
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Small center crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
    ctx.restore();
  }

  // Mouse Handlers
  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    const pt = clientToCanvasCoords(e.clientX, e.clientY);

    // Color picker: INSTANT CLICK TO COPY!
    if (currentTool === 'color-picker') {
      const color = samplePixelColor(e.clientX, e.clientY, pt);
      if (color) {
        const hex = rgbToHex(color.r, color.g, color.b);
        if (window.snapshotAPI) {
          await window.snapshotAPI.copyText(hex);
        } else {
          await navigator.clipboard.writeText(hex);
        }
        onShowToast(`Copied ${hex} to clipboard!`);
        setIsLoupePinned(true);
      }
      return;
    }

    // Text tool
    if (currentTool === 'text') {
      setTextInputPos(pt);
      setCurrentTextVal('');
      return;
    }

    // Step tool
    if (currentTool === 'step') {
      const stepCount = annotations.filter((a) => a.type === 'step').length + 1;
      const newStep: Annotation = {
        id: `ann_${Date.now()}`,
        type: 'step',
        x: pt.x,
        y: pt.y,
        width: 32,
        height: 32,
        color: selectedColor,
        strokeWidth: 2,
        stepNumber: stepCount
      };
      onUpdateAnnotations([...annotations, newStep]);
      return;
    }

    // Stamp tool
    if (currentTool === 'stamp') {
      const newStamp: Annotation = {
        id: `ann_${Date.now()}`,
        type: 'stamp',
        x: pt.x,
        y: pt.y,
        width: 32,
        height: 32,
        color: selectedColor,
        strokeWidth: 2,
        stampType
      };
      onUpdateAnnotations([...annotations, newStamp]);
      return;
    }

    // Select tool: Check handles or annotation body
    if (currentTool === 'select') {
      // 1. Check if clicking on handle of currently selected annotation
      if (selectedAnnotationId) {
        const curSel = annotations.find((a) => a.id === selectedAnnotationId);
        if (curSel) {
          const normX = Math.min(curSel.x, curSel.x + curSel.width);
          const normY = Math.min(curSel.y, curSel.y + curSel.height);
          const normW = Math.abs(curSel.width);
          const normH = Math.abs(curSel.height);
          const thresh = 12;

          if (Math.hypot(pt.x - normX, pt.y - normY) <= thresh) {
            setDragMode('nw');
            setDragStartPoint(pt);
            setInitialAnnState({ ...curSel });
            return;
          }
          if (Math.hypot(pt.x - (normX + normW), pt.y - normY) <= thresh) {
            setDragMode('ne');
            setDragStartPoint(pt);
            setInitialAnnState({ ...curSel });
            return;
          }
          if (Math.hypot(pt.x - (normX + normW), pt.y - (normY + normH)) <= thresh) {
            setDragMode('se');
            setDragStartPoint(pt);
            setInitialAnnState({ ...curSel });
            return;
          }
          if (Math.hypot(pt.x - normX, pt.y - (normY + normH)) <= thresh) {
            setDragMode('sw');
            setDragStartPoint(pt);
            setInitialAnnState({ ...curSel });
            return;
          }
        }
      }

      // 2. Check if clicking on any annotation body
      const found = [...annotations].reverse().find((ann) => {
        const normX = Math.min(ann.x, ann.x + ann.width);
        const normY = Math.min(ann.y, ann.y + ann.height);
        const normW = Math.abs(ann.width);
        const normH = Math.abs(ann.height);
        return (
          pt.x >= normX - 6 &&
          pt.x <= normX + normW + 6 &&
          pt.y >= normY - 6 &&
          pt.y <= normY + normH + 6
        );
      });

      if (found) {
        onSelectAnnotation(found.id);
        setDragMode('move');
        setDragStartPoint(pt);
        setInitialAnnState({ ...found });
      } else {
        onSelectAnnotation(null);
      }
      return;
    }

    // Drawing new annotation
    setIsDrawing(true);
    setDrawStart(pt);

    const newAnn: Annotation = {
      id: `ann_${Date.now()}`,
      type: currentTool,
      x: pt.x,
      y: pt.y,
      width: 0,
      height: 0,
      color: selectedColor,
      strokeWidth,
      fontSize,
      fontFamily,
      fontWeight,
      hasBackground,
      redactionStyle,
      magnification,
      points: [pt]
    };

    activeAnnotationRef.current = newAnn;
    setActiveAnnotation(newAnn);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const clientX = e.clientX;
    const clientY = e.clientY;

    const pt = clientToCanvasCoords(clientX, clientY);
    setMouseCanvasCoords(pt);

    if (dragMode && dragStartPoint && initialAnnState) {
      const dx = pt.x - dragStartPoint.x;
      const dy = pt.y - dragStartPoint.y;
      let updated: Annotation = { ...initialAnnState };

      if (dragMode === 'move') {
        updated.x = Math.round(initialAnnState.x + dx);
        updated.y = Math.round(initialAnnState.y + dy);
      } else if (dragMode === 'se') {
        updated.width = Math.max(10, Math.round(initialAnnState.width + dx));
        updated.height = Math.max(10, Math.round(initialAnnState.height + dy));
      } else if (dragMode === 'sw') {
        updated.x = Math.round(initialAnnState.x + dx);
        updated.width = Math.max(10, Math.round(initialAnnState.width - dx));
        updated.height = Math.max(10, Math.round(initialAnnState.height + dy));
      } else if (dragMode === 'ne') {
        updated.y = Math.round(initialAnnState.y + dy);
        updated.width = Math.max(10, Math.round(initialAnnState.width + dx));
        updated.height = Math.max(10, Math.round(initialAnnState.height - dy));
      } else if (dragMode === 'nw') {
        updated.x = Math.round(initialAnnState.x + dx);
        updated.y = Math.round(initialAnnState.y + dy);
        updated.width = Math.max(10, Math.round(initialAnnState.width - dx));
        updated.height = Math.max(10, Math.round(initialAnnState.height - dy));
      }

      onUpdateAnnotations(annotations.map((a) => (a.id === updated.id ? updated : a)));
      return;
    }

    if (!isPanning && !isDrawing && currentTool !== 'color-picker') {
      return;
    }

    pendingMouseCoords.current = { clientX, clientY };

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!pendingMouseCoords.current) return;
        const { clientX: curX, clientY: curY } = pendingMouseCoords.current;

        if (isPanning) {
          setPan({ x: curX - panStart.x, y: curY - panStart.y });
          return;
        }

        const currentPt = clientToCanvasCoords(curX, curY);

        // Live color loupe sampling when hovering
        if (currentTool === 'color-picker' && !isLoupePinned) {
          samplePixelColor(curX, curY, currentPt);
          return;
        }

        if (!isDrawing || !drawStart || !activeAnnotationRef.current) return;

        const currentActive = activeAnnotationRef.current;
        if (currentActive.type === 'pen' || currentActive.type === 'highlighter') {
          const updated: Annotation = {
            ...currentActive,
            points: [...(currentActive.points || []), currentPt],
            width: currentPt.x - drawStart.x,
            height: currentPt.y - drawStart.y
          };
          activeAnnotationRef.current = updated;
          setActiveAnnotation(updated);
        } else {
          const updated: Annotation = {
            ...currentActive,
            width: currentPt.x - drawStart.x,
            height: currentPt.y - drawStart.y
          };
          activeAnnotationRef.current = updated;
          setActiveAnnotation(updated);
        }
      });
    }
  };

  const handleMouseUp = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (dragMode) {
      setDragMode(null);
      setDragStartPoint(null);
      setInitialAnnState(null);
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    const currentActive = activeAnnotationRef.current || activeAnnotation;

    if (isDrawing && currentActive && drawStart) {
      let finalized = { ...currentActive };

      // Apply final coordinates if pending
      if (pendingMouseCoords.current) {
        const finalPt = clientToCanvasCoords(pendingMouseCoords.current.clientX, pendingMouseCoords.current.clientY);
        if (finalized.type === 'pen' || finalized.type === 'highlighter') {
          finalized.points = [...(finalized.points || []), finalPt];
        }
        finalized.width = finalPt.x - drawStart.x;
        finalized.height = finalPt.y - drawStart.y;
      }

      if (['rect', 'rounded-rect', 'blur', 'redact', 'spotlight', 'loupe-annotation', 'callout'].includes(finalized.type)) {
        let left = finalized.x;
        let top = finalized.y;
        let width = finalized.width;
        let height = finalized.height;
        if (width < 0) {
          left += width;
          width = Math.abs(width);
        }
        if (height < 0) {
          top += height;
          height = Math.abs(height);
        }
        finalized.x = left;
        finalized.y = top;
        finalized.width = width;
        finalized.height = height;
      }

      if (
        Math.abs(finalized.width) > 3 ||
        Math.abs(finalized.height) > 3 ||
        (finalized.points && finalized.points.length > 2)
      ) {
        onUpdateAnnotations([...annotations, finalized]);
      }
    }

    setIsDrawing(false);
    activeAnnotationRef.current = null;
    setActiveAnnotation(null);
    setDrawStart(null);
    pendingMouseCoords.current = null;
  };

  // Sample pixel color from underlying canvas
  const samplePixelColor = (
    screenX: number,
    screenY: number,
    pt: Point
  ): { r: number; g: number; b: number; a: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    try {
      const pixel = ctx.getImageData(Math.round(pt.x), Math.round(pt.y), 1, 1).data;
      const col = { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
      setLoupeColor(col);
      setLoupeScreenPos({ x: screenX, y: screenY });
      return col;
    } catch {
      return null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.2, Math.min(3.0, zoom + zoomDelta));
      onZoomChange(newZoom);
    }
  };

  const handleTextSubmit = () => {
    if (editingTextAnnId) {
      if (currentTextVal.trim()) {
        const lines = currentTextVal.split('\n');
        const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
        const calculatedW = Math.max(60, maxLineLen * (fontSize * 0.65));
        const calculatedH = Math.max(30, lines.length * (fontSize * 1.35));
        onUpdateAnnotations(
          annotations.map((a) =>
            a.id === editingTextAnnId
              ? {
                  ...a,
                  text: currentTextVal,
                  width: Math.max(a.width, calculatedW),
                  height: Math.max(a.height, calculatedH)
                }
              : a
          )
        );
      } else {
        onUpdateAnnotations(annotations.filter((a) => a.id !== editingTextAnnId));
        onSelectAnnotation(null);
      }
      setEditingTextAnnId(null);
      setTextInputPos(null);
      setCurrentTextVal('');
      return;
    }

    if (textInputPos && currentTextVal.trim()) {
      const lines = currentTextVal.split('\n');
      const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
      const calculatedW = Math.max(60, maxLineLen * (fontSize * 0.65));
      const calculatedH = Math.max(30, lines.length * (fontSize * 1.35));

      const newTextAnn: Annotation = {
        id: `ann_${Date.now()}`,
        type: 'text',
        x: textInputPos.x,
        y: textInputPos.y,
        width: calculatedW,
        height: calculatedH,
        text: currentTextVal,
        color: selectedColor,
        strokeWidth: 2,
        fontSize,
        fontFamily,
        fontWeight,
        hasBackground
      };
      onUpdateAnnotations([...annotations, newTextAnn]);
    }
    setTextInputPos(null);
    setCurrentTextVal('');
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const pt = clientToCanvasCoords(e.clientX, e.clientY);
    const found = [...annotations].reverse().find((ann) => {
      const normX = Math.min(ann.x, ann.x + ann.width);
      const normY = Math.min(ann.y, ann.y + ann.height);
      const normW = Math.abs(ann.width);
      const normH = Math.abs(ann.height);
      return (
        pt.x >= normX - 6 &&
        pt.x <= normX + normW + 6 &&
        pt.y >= normY - 6 &&
        pt.y <= normY + normH + 6
      );
    });
    if (found && (found.type === 'text' || found.type === 'callout')) {
      setEditingTextAnnId(found.id);
      setTextInputPos({ x: found.x, y: found.y });
      setCurrentTextVal(found.text || '');
    }
  };

  const handleDuplicateAnnotation = (annId: string) => {
    const ann = annotations.find((a) => a.id === annId);
    if (!ann) return;
    const newAnn: Annotation = {
      ...ann,
      id: `ann_${Date.now()}`,
      x: ann.x + 20,
      y: ann.y + 20
    };
    onUpdateAnnotations([...annotations, newAnn]);
    onSelectAnnotation(newAnn.id);
    onShowToast('Annotation duplicated');
  };

  const handleDeleteAnnotation = (annId: string) => {
    onUpdateAnnotations(annotations.filter((a) => a.id !== annId));
    if (selectedAnnotationId === annId) {
      onSelectAnnotation(null);
    }
  };

  // Find currently selected annotation object for contextual actions
  const selectedAnn = selectedAnnotationId ? annotations.find((a) => a.id === selectedAnnotationId) : null;

  const { canvasWidth, canvasHeight } = getCanvasDimensions();

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
          e.preventDefault();
          if (selectedAnnotationId) handleDuplicateAnnotation(selectedAnnotationId);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedAnnotationId) handleDeleteAnnotation(selectedAnnotationId);
        } else if (e.key === 'Escape') {
          if (textInputPos) {
            setTextInputPos(null);
            setCurrentTextVal('');
            setEditingTextAnnId(null);
          } else {
            onSelectAnnotation(null);
          }
        }
      }}
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
        cursor: currentTool === 'color-picker' ? 'crosshair' : currentTool === 'select' ? 'default' : 'crosshair'
      }}
    >
      <div
        style={{
          position: 'relative',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.05s ease',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{ display: 'block', maxWidth: 'none', maxHeight: 'none' }}
        />

        {/* Floating Contextual Action Toolbar for selected annotation */}
        {selectedAnn && !textInputPos && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(selectedAnn.x, selectedAnn.x + selectedAnn.width)}px`,
              top: `${Math.max(6, Math.min(selectedAnn.y, selectedAnn.y + selectedAnn.height) - 44)}px`,
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(18, 19, 22, 0.96)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 7,
              padding: '4px 7px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
              transformOrigin: 'bottom left'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {(selectedAnn.type === 'text' || selectedAnn.type === 'callout') && (
              <>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setEditingTextAnnId(selectedAnn.id);
                    setTextInputPos({ x: selectedAnn.x, y: selectedAnn.y });
                    setCurrentTextVal(selectedAnn.text || '');
                  }}
                  title="Edit Text"
                  style={{ padding: '3px 6px', fontSize: 11, gap: 4 }}
                >
                  <Edit3 size={12} color="var(--accent-light)" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  className={selectedAnn.fontWeight === 'bold' ? 'primary' : 'ghost'}
                  onClick={() => {
                    const newWeight = selectedAnn.fontWeight === 'bold' ? 'normal' : 'bold';
                    onUpdateAnnotations(
                      annotations.map((a) => (a.id === selectedAnn.id ? { ...a, fontWeight: newWeight } : a))
                    );
                  }}
                  title="Toggle Bold"
                  style={{ padding: '3px 6px' }}
                >
                  <Bold size={12} />
                </button>

                <button
                  type="button"
                  className={selectedAnn.hasBackground ? 'primary' : 'ghost'}
                  onClick={() => {
                    onUpdateAnnotations(
                      annotations.map((a) => (a.id === selectedAnn.id ? { ...a, hasBackground: !a.hasBackground } : a))
                    );
                  }}
                  title="Toggle Background Pill Badge"
                  style={{ padding: '3px 6px', fontSize: 11, gap: 4 }}
                >
                  <Sparkles size={12} />
                  <span>Badge</span>
                </button>

                <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-default)' }} />
              </>
            )}

            <button
              type="button"
              className="ghost"
              onClick={() => handleDuplicateAnnotation(selectedAnn.id)}
              title="Duplicate (Ctrl+D)"
              style={{ padding: '3px 6px', fontSize: 11, gap: 4 }}
            >
              <Copy size={12} />
              <span>Clone</span>
            </button>

            <button
              type="button"
              className="ghost"
              onClick={() => handleDeleteAnnotation(selectedAnn.id)}
              title="Delete (Del / Backspace)"
              style={{ padding: '3px 6px', color: 'var(--danger-primary)' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}

        {/* Floating multiline text editor right at canvas coordinates */}
        {textInputPos && (
          <div
            style={{
              position: 'absolute',
              left: `${textInputPos.x}px`,
              top: `${textInputPos.y}px`,
              zIndex: 1000
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <textarea
              autoFocus
              value={currentTextVal}
              onChange={(e) => setCurrentTextVal(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleTextSubmit();
                } else if (e.key === 'Escape') {
                  setTextInputPos(null);
                  setCurrentTextVal('');
                  setEditingTextAnnId(null);
                }
              }}
              placeholder="Type text... (Ctrl+Enter to commit, Enter for newline, Esc to cancel)"
              style={{
                minWidth: 180,
                minHeight: 52,
                font: `${fontWeight} ${fontSize}px ${fontFamily || 'sans-serif'}`,
                color: selectedColor,
                backgroundColor: 'rgba(15, 23, 42, 0.94)',
                border: '2px solid var(--accent-primary)',
                borderRadius: '6px',
                padding: '6px 8px',
                outline: 'none',
                resize: 'both',
                boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
                lineHeight: 1.35
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleTextSubmit}
                className="primary"
                style={{ padding: '3px 8px', fontSize: 11 }}
              >
                Done (Ctrl+↵)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTextInputPos(null);
                  setCurrentTextVal('');
                  setEditingTextAnnId(null);
                }}
                className="ghost"
                style={{ padding: '3px 8px', fontSize: 11 }}
              >
                Cancel (Esc)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Precision Coordinates & Canvas Metrics HUD Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 14,
          backgroundColor: 'rgba(18, 19, 22, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
          zIndex: 50,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <span>{canvasWidth} × {canvasHeight}px</span>
        <span style={{ color: 'var(--border-default)' }}>|</span>
        <span>{Math.round(zoom * 100)}%</span>
        <span style={{ color: 'var(--border-default)' }}>|</span>
        <span style={{ color: 'var(--accent-light)' }}>
          X: {mouseCanvasCoords ? Math.round(mouseCanvasCoords.x) : '—'} Y:{' '}
          {mouseCanvasCoords ? Math.round(mouseCanvasCoords.y) : '—'}
        </span>
      </div>

      {/* Color picker magnifying loupe with one-click copy */}
      {currentTool === 'color-picker' && loupeColor && (
        <ColorPickerLoupe
          pixelColor={loupeColor}
          position={loupeScreenPos}
          onClose={() => setIsLoupePinned(false)}
          onCopied={(val) => onShowToast(`Copied ${val} to clipboard!`)}
        />
      )}
    </div>
  );
};
