import React, { useState, useEffect, useRef } from 'react';
import { Download, Crop, RotateCw, ZoomIn, ZoomOut, Check, RefreshCw, Sliders, FileImage, Move } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import { useLanguage } from '../../context/LanguageContext';

type AspectRatioPreset = {
  name: string;
  ratio: number | 'free';
};

const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { name: 'Free (Custom Handles)', ratio: 'free' },
  { name: '1:1 (Square)', ratio: 1 },
  { name: '16:9 (Cinematic)', ratio: 16 / 9 },
  { name: '4:3 (Standard)', ratio: 4 / 3 },
  { name: '3:2 (Classic)', ratio: 3 / 2 },
  { name: '2:3 (Portrait)', ratio: 2 / 3 },
  { name: '9:16 (Vertical)', ratio: 9 / 16 }
];

type DragHandle = 'none' | 'move' | 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'bottom' | 'left' | 'right';

// Helper to inject DPI in JPEG JFIF header
const changeDpiInJpeg = (blob: Blob, dpi: number): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) {
        resolve(blob);
        return;
      }
      const view = new DataView(buffer);
      if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
        resolve(blob);
        return;
      }
      
      let offset = 2;
      while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset);
        if (marker === 0xFFE0) {
          const length = view.getUint16(offset + 2);
          if (offset + 2 + length <= view.byteLength && length >= 14) {
            if (
              view.getUint8(offset + 4) === 0x4A && // 'J'
              view.getUint8(offset + 5) === 0x46 && // 'F'
              view.getUint8(offset + 6) === 0x49 && // 'I'
              view.getUint8(offset + 7) === 0x46 && // 'F'
              view.getUint8(offset + 8) === 0x00    // '\0'
            ) {
              view.setUint8(offset + 13, 1);
              view.setUint16(offset + 14, dpi);
              view.setUint16(offset + 16, dpi);
              resolve(new Blob([buffer], { type: 'image/jpeg' }));
              return;
            }
          }
          offset += length + 2;
        } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFFD8 && marker !== 0xFFD9) {
          const length = view.getUint16(offset + 2);
          offset += length + 2;
        } else {
          break;
        }
      }
      
      const app0Segment = new Uint8Array([
        0xFF, 0xE0, 0x00, 0x10,
        0x4A, 0x46, 0x49, 0x46, 0x00,
        0x01, 0x01, 0x01,
        (dpi >> 8) & 0xFF, dpi & 0xFF,
        (dpi >> 8) & 0xFF, dpi & 0xFF,
        0x00, 0x00
      ]);
      const newBuffer = new Uint8Array(buffer.byteLength + app0Segment.length);
      newBuffer.set(new Uint8Array(buffer.slice(0, 2)), 0);
      newBuffer.set(app0Segment, 2);
      newBuffer.set(new Uint8Array(buffer.slice(2)), 2 + app0Segment.length);
      resolve(new Blob([newBuffer], { type: 'image/jpeg' }));
    };
    reader.onerror = () => resolve(blob);
    reader.readAsArrayBuffer(blob);
  });
};

export const ImageCropper: React.FC = () => {
  const { t } = useLanguage();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [originalSizeKb, setOriginalSizeKb] = useState<number>(0);

  // Fixed internal workspace resolution (100% locked 4:3 ratio)
  const workspaceWidth = 600;
  const workspaceHeight = 450;

  // Interactive Crop Box Rect state (x, y, width, height) relative to workspace
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 100,
    y: 75,
    w: 400,
    h: 300
  });

  // Presets & Modes
  const [cropMode, setCropMode] = useState<'preset' | 'custom-cm'>('preset');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioPreset>(ASPECT_RATIO_PRESETS[0]); // Default Free

  // Custom cm & DPI states
  const [widthCm, setWidthCm] = useState<number>(3.5);
  const [heightCm, setHeightCm] = useState<number>(4.5);
  const [dpi, setDpi] = useState<number>(300);

  // Transformations
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);

  // Output states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [croppedSizeKb, setCroppedSizeKb] = useState<number>(0);

  // Interactive Dragging Refs & Workspace Wrapper Ref
  const workspaceWrapperRef = useRef<HTMLDivElement>(null);
  const workspaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeHandleRef = useRef<DragHandle>('none');
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialRectRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });

  // Handle files selected
  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];

    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);

    const url = URL.createObjectURL(file);
    setOriginalFile(file);
    setOriginalSizeKb(Math.round(file.size / 1024));
    setOriginalUrl(url);

    setCroppedBlob(null);
    setCroppedUrl(null);
    setCroppedSizeKb(0);
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setIsGrayscale(false);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImageObj(img);
      const defaultW = Math.min(workspaceWidth - 80, 400);
      const defaultH = Math.min(workspaceHeight - 80, 300);
      setCropRect({
        x: Math.round((workspaceWidth - defaultW) / 2),
        y: Math.round((workspaceHeight - defaultH) / 2),
        w: defaultW,
        h: defaultH
      });
    };
  };

  // Adjust crop rect when aspect ratio preset is selected
  useEffect(() => {
    if (cropMode === 'preset') {
      if (selectedRatio.ratio !== 'free') {
        const r = selectedRatio.ratio as number;
        let newW = cropRect.w;
        let newH = Math.round(newW / r);

        if (newH > workspaceHeight - 40) {
          newH = workspaceHeight - 40;
          newW = Math.round(newH * r);
        }

        setCropRect(prev => ({
          ...prev,
          w: Math.min(newW, workspaceWidth - 20),
          h: Math.min(newH, workspaceHeight - 20)
        }));
      }
    } else {
      const w = Math.max(0.1, widthCm);
      const h = Math.max(0.1, heightCm);
      const r = w / h;
      let newW = 350;
      let newH = Math.round(newW / r);
      if (newH > workspaceHeight - 40) {
        newH = workspaceHeight - 40;
        newW = Math.round(newH * r);
      }
      setCropRect(prev => ({
        ...prev,
        w: newW,
        h: newH
      }));
    }
  }, [cropMode, selectedRatio, widthCm, heightCm]);

  // Render background image on canvas
  useEffect(() => {
    if (!imageObj || !workspaceCanvasRef.current) return;
    const canvas = workspaceCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (isGrayscale) filterString += ' grayscale(100%)';
    ctx.filter = filterString;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    const baseScale = Math.min(canvas.width / imageObj.width, canvas.height / imageObj.height);
    const drawWidth = imageObj.width * baseScale * zoom;
    const drawHeight = imageObj.height * baseScale * zoom;

    ctx.drawImage(imageObj, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [imageObj, zoom, rotation, brightness, contrast, isGrayscale]);

  /**
   * Universal Handle Pointer Drag Handler (Locked 1:1 with Workspace Wrapper)
   */
  const startDrag = (e: React.PointerEvent | React.MouseEvent, handle: DragHandle) => {
    e.stopPropagation();
    e.preventDefault();

    activeHandleRef.current = handle;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialRectRef.current = { ...cropRect };

    const handlePointerMove = (moveEvt: PointerEvent | MouseEvent) => {
      if (activeHandleRef.current === 'none') return;
      const wrapper = workspaceWrapperRef.current;
      if (!wrapper) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const scaleX = workspaceWidth / wrapperRect.width;
      const scaleY = workspaceHeight / wrapperRect.height;

      const dx = (moveEvt.clientX - dragStartRef.current.x) * scaleX;
      const dy = (moveEvt.clientY - dragStartRef.current.y) * scaleY;
      const init = initialRectRef.current;
      const minSize = 40;

      let newX = init.x;
      let newY = init.y;
      let newW = init.w;
      let newH = init.h;

      const active = activeHandleRef.current;

      if (active === 'move') {
        newX = Math.max(0, Math.min(workspaceWidth - init.w, init.x + dx));
        newY = Math.max(0, Math.min(workspaceHeight - init.h, init.y + dy));
      } else if (active === 'br') {
        newW = Math.max(minSize, Math.min(workspaceWidth - init.x, init.w + dx));
        newH = selectedRatio.ratio === 'free' 
          ? Math.max(minSize, Math.min(workspaceHeight - init.y, init.h + dy)) 
          : Math.round(newW / (selectedRatio.ratio as number));
      } else if (active === 'bl') {
        const possibleW = Math.max(minSize, init.w - dx);
        newX = init.x + (init.w - possibleW);
        newW = possibleW;
        newH = selectedRatio.ratio === 'free' 
          ? Math.max(minSize, Math.min(workspaceHeight - init.y, init.h + dy)) 
          : Math.round(newW / (selectedRatio.ratio as number));
      } else if (active === 'tr') {
        newW = Math.max(minSize, Math.min(workspaceWidth - init.x, init.w + dx));
        const possibleH = selectedRatio.ratio === 'free' 
          ? Math.max(minSize, init.h - dy) 
          : Math.round(newW / (selectedRatio.ratio as number));
        newY = init.y + (init.h - possibleH);
        newH = possibleH;
      } else if (active === 'tl') {
        const possibleW = Math.max(minSize, init.w - dx);
        newX = init.x + (init.w - possibleW);
        newW = possibleW;
        const possibleH = selectedRatio.ratio === 'free' 
          ? Math.max(minSize, init.h - dy) 
          : Math.round(newW / (selectedRatio.ratio as number));
        newY = init.y + (init.h - possibleH);
        newH = possibleH;
      } else if (active === 'right') {
        newW = Math.max(minSize, Math.min(workspaceWidth - init.x, init.w + dx));
      } else if (active === 'left') {
        const possibleW = Math.max(minSize, init.w - dx);
        newX = init.x + (init.w - possibleW);
        newW = possibleW;
      } else if (active === 'bottom') {
        newH = Math.max(minSize, Math.min(workspaceHeight - init.y, init.h + dy));
      } else if (active === 'top') {
        const possibleH = Math.max(minSize, init.h - dy);
        newY = init.y + (init.h - possibleH);
        newH = possibleH;
      }

      setCropRect({
        x: Math.round(newX),
        y: Math.round(newY),
        w: Math.round(newW),
        h: Math.round(newH)
      });
    };

    const handlePointerUp = () => {
      activeHandleRef.current = 'none';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  /**
   * Execute Cropping at 100% Full High Resolution & Zero Quality Loss
   */
  const triggerCrop = async () => {
    if (!imageObj || !workspaceCanvasRef.current) return;
    setIsProcessing(true);

    try {
      const canvas = workspaceCanvasRef.current;
      const baseScale = Math.min(canvas.width / imageObj.naturalWidth, canvas.height / imageObj.naturalHeight);
      const drawWidth = imageObj.naturalWidth * baseScale * zoom;
      const drawHeight = imageObj.naturalHeight * baseScale * zoom;

      const imgOriginX = (canvas.width - drawWidth) / 2;
      const imgOriginY = (canvas.height - drawHeight) / 2;

      // Crop coordinates relative to the rendered image bounds inside workspace
      const cropRelativeX = (cropRect.x - imgOriginX) / drawWidth;
      const cropRelativeY = (cropRect.y - imgOriginY) / drawHeight;
      const cropRelativeW = cropRect.w / drawWidth;
      const cropRelativeH = cropRect.h / drawHeight;

      // Map to full natural pixel dimensions of source image
      const srcX = Math.max(0, Math.min(imageObj.naturalWidth, cropRelativeX * imageObj.naturalWidth));
      const srcY = Math.max(0, Math.min(imageObj.naturalHeight, cropRelativeY * imageObj.naturalHeight));
      const srcW = Math.max(1, Math.min(imageObj.naturalWidth - srcX, cropRelativeW * imageObj.naturalWidth));
      const srcH = Math.max(1, Math.min(imageObj.naturalHeight - srcY, cropRelativeH * imageObj.naturalHeight));

      let outputW: number;
      let outputH: number;

      if (cropMode === 'preset') {
        // High resolution native pixels
        outputW = Math.max(1, Math.round(srcW));
        outputH = Math.max(1, Math.round(srcH));
      } else {
        outputW = Math.round((widthCm / 2.54) * dpi);
        outputH = Math.round((heightCm / 2.54) * dpi);
      }

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = outputW;
      renderCanvas.height = outputH;
      const rCtx = renderCanvas.getContext('2d');
      if (!rCtx) throw new Error('Could not create output canvas context');

      rCtx.imageSmoothingEnabled = true;
      rCtx.imageSmoothingQuality = 'high';

      let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
      if (isGrayscale) filterString += ' grayscale(100%)';
      rCtx.filter = filterString;

      if (rotation === 0) {
        rCtx.drawImage(imageObj, srcX, srcY, srcW, srcH, 0, 0, outputW, outputH);
      } else {
        rCtx.translate(outputW / 2, outputH / 2);
        rCtx.rotate((rotation * Math.PI) / 180);
        rCtx.drawImage(imageObj, srcX, srcY, srcW, srcH, -outputW / 2, -outputH / 2, outputW, outputH);
      }

      const mimeType = originalFile?.type === 'image/png' ? 'image/png' : 'image/jpeg';

      renderCanvas.toBlob(
        async (blob) => {
          if (blob) {
            let finalBlob = blob;
            if (cropMode === 'custom-cm' && mimeType === 'image/jpeg') {
              finalBlob = await changeDpiInJpeg(blob, dpi);
            }
            if (croppedUrl) URL.revokeObjectURL(croppedUrl);
            setCroppedBlob(finalBlob);
            setCroppedUrl(URL.createObjectURL(finalBlob));
            setCroppedSizeKb(Math.round(finalBlob.size / 1024));
          }
          setIsProcessing(false);
        },
        mimeType,
        1.0 // 100% Maximum Quality (Crystal clear, zero compression blur)
      );
    } catch (err) {
      console.error('Error cropping image:', err);
      alert('Cropping failed. Please adjust workspace inputs and try again.');
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!croppedBlob || !originalFile) return;
    const link = document.createElement('a');
    const baseName = originalFile.name.replace(/\.[^/.]+$/, "");
    const ext = originalFile.type === 'image/png' ? 'png' : 'jpg';
    link.href = URL.createObjectURL(croppedBlob);
    link.download = `${baseName}_cropped.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearTool = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    setOriginalFile(null);
    setOriginalUrl(null);
    setImageObj(null);
    setCroppedBlob(null);
    setCroppedUrl(null);
    setCroppedSizeKb(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="image-crop"
        title={t('tool.imageCrop.title')}
        description={t('tool.imageCrop.desc')}
        category="image"
        categoryName="Image Tools"
      />

      {!originalFile ? (
        <div className="mt-8 max-w-2xl mx-auto">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            accept="image/*"
            maxSizeMB={25}
            label="Upload an image to crop with 100% accurate preview"
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Interactive Workspace */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Interactive Crop Workspace {originalSizeKb > 0 ? `(Original: ${originalSizeKb} KB)` : ''}
              </span>
              <button
                onClick={clearTool}
                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                Upload New Image
              </button>
            </div>

            {/* Outer Container with dark background */}
            <div className="flex-1 flex items-center justify-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 min-h-[460px] relative overflow-hidden select-none touch-none">
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 z-40 flex flex-col items-center justify-center text-white p-4 text-center">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-bold">Processing high-resolution crop...</p>
                </div>
              )}

              {/* 100% Locked 4:3 Aspect Ratio Workspace Wrapper */}
              <div 
                ref={workspaceWrapperRef}
                style={{ aspectRatio: `${workspaceWidth} / ${workspaceHeight}` }}
                className="relative w-full max-w-[600px] max-h-[450px] bg-slate-900 border border-slate-800 rounded-lg shadow-2xl flex items-center justify-center overflow-hidden"
              >
                {/* Background Rendered Image Canvas */}
                <canvas
                  ref={workspaceCanvasRef}
                  width={workspaceWidth}
                  height={workspaceHeight}
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Interactive Crop Box Overlay aligned 1:1 with Workspace Wrapper */}
                <div
                  style={{
                    left: `${(cropRect.x / workspaceWidth) * 100}%`,
                    top: `${(cropRect.y / workspaceHeight) * 100}%`,
                    width: `${(cropRect.w / workspaceWidth) * 100}%`,
                    height: `${(cropRect.h / workspaceHeight) * 100}%`
                  }}
                  onPointerDown={(e) => startDrag(e, 'move')}
                  className="absolute border-2 border-brand-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] z-20 pointer-events-auto cursor-move"
                >
                  {/* 3x3 Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 divide-x divide-white/30 pointer-events-none">
                    <div />
                    <div />
                    <div />
                  </div>
                  <div className="absolute inset-0 grid grid-rows-3 divide-y divide-white/30 pointer-events-none">
                    <div />
                    <div />
                    <div />
                  </div>

                  {/* 4 Corner Drag Handles */}
                  <div 
                    onPointerDown={(e) => startDrag(e, 'tl')}
                    title="Drag Top-Left Corner"
                    className="absolute -left-3 -top-3 w-6 h-6 bg-white border-2 border-brand-500 rounded-full shadow-xl cursor-nwse-resize hover:scale-125 transition-transform flex items-center justify-center z-30"
                  >
                    <div className="w-2 h-2 bg-brand-500 rounded-full" />
                  </div>

                  <div 
                    onPointerDown={(e) => startDrag(e, 'tr')}
                    title="Drag Top-Right Corner"
                    className="absolute -right-3 -top-3 w-6 h-6 bg-white border-2 border-brand-500 rounded-full shadow-xl cursor-nesw-resize hover:scale-125 transition-transform flex items-center justify-center z-30"
                  >
                    <div className="w-2 h-2 bg-brand-500 rounded-full" />
                  </div>

                  <div 
                    onPointerDown={(e) => startDrag(e, 'bl')}
                    title="Drag Bottom-Left Corner"
                    className="absolute -left-3 -bottom-3 w-6 h-6 bg-white border-2 border-brand-500 rounded-full shadow-xl cursor-nesw-resize hover:scale-125 transition-transform flex items-center justify-center z-30"
                  >
                    <div className="w-2 h-2 bg-brand-500 rounded-full" />
                  </div>

                  <div 
                    onPointerDown={(e) => startDrag(e, 'br')}
                    title="Drag Bottom-Right Corner"
                    className="absolute -right-3 -bottom-3 w-6 h-6 bg-white border-2 border-brand-500 rounded-full shadow-xl cursor-nwse-resize hover:scale-125 transition-transform flex items-center justify-center z-30"
                  >
                    <div className="w-2 h-2 bg-brand-500 rounded-full" />
                  </div>

                  {/* 4 Edge Midpoint Drag Handles */}
                  <div 
                    onPointerDown={(e) => startDrag(e, 'top')}
                    className="absolute left-1/2 -top-2.5 -translate-x-1/2 w-8 h-4 bg-white border-2 border-brand-500 rounded-full shadow-md cursor-ns-resize z-30" 
                  />
                  <div 
                    onPointerDown={(e) => startDrag(e, 'bottom')}
                    className="absolute left-1/2 -bottom-2.5 -translate-x-1/2 w-8 h-4 bg-white border-2 border-brand-500 rounded-full shadow-md cursor-ns-resize z-30" 
                  />
                  <div 
                    onPointerDown={(e) => startDrag(e, 'left')}
                    className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-4 h-8 bg-white border-2 border-brand-500 rounded-full shadow-md cursor-ew-resize z-30" 
                  />
                  <div 
                    onPointerDown={(e) => startDrag(e, 'right')}
                    className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-4 h-8 bg-white border-2 border-brand-500 rounded-full shadow-md cursor-ew-resize z-30" 
                  />

                  {/* Crop Box Size Indicator Badge */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-brand-600 px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                    {cropRect.w} × {cropRect.h} px
                  </div>
                </div>
              </div>

              <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-md pointer-events-none z-30 flex items-center gap-1.5">
                <Move size={12} className="text-brand-400" />
                <span>Drag corners to resize selection</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex justify-center gap-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-brand-500 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="self-center text-xs font-bold text-slate-500">
                Zoom: {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-brand-500 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <div className="w-px bg-slate-200 dark:bg-slate-800 self-stretch my-1" />
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-brand-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
                title="Rotate 90deg"
              >
                <RotateCw size={16} />
                Rotate 90°
              </button>
            </div>
          </div>

          {/* Right Column: Settings Panel */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
                <FileImage size={16} className="text-brand-500" />
                Aspect Ratio & Presets
              </h3>

              {/* Crop Mode Selection Tabs */}
              <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 mb-4">
                <button
                  type="button"
                  onClick={() => setCropMode('preset')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    cropMode === 'preset'
                      ? 'bg-white dark:bg-dark-card text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  Presets & Free Handle
                </button>
                <button
                  type="button"
                  onClick={() => setCropMode('custom-cm')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    cropMode === 'custom-cm'
                      ? 'bg-white dark:bg-dark-card text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                  }`}
                >
                  Custom Size (cm & DPI)
                </button>
              </div>

              {cropMode === 'preset' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                  {ASPECT_RATIO_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setSelectedRatio(preset)}
                      className={`py-2 text-[11px] font-bold rounded-lg border transition-colors text-center ${
                        selectedRatio.name === preset.name
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Width (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={widthCm}
                        onChange={(e) => setWidthCm(Math.max(0.1, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-brand-500 font-bold text-slate-850 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={heightCm}
                        onChange={(e) => setHeightCm(Math.max(0.1, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-brand-500 font-bold text-slate-850 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      DPI (Resolution)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="number"
                        min="1"
                        value={dpi}
                        onChange={(e) => setDpi(Math.max(1, parseInt(e.target.value) || 0))}
                        className="col-span-2 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-brand-500 font-bold text-slate-850 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setDpi(150)}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-colors text-center ${
                          dpi === 150
                            ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                            : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        150
                      </button>
                      <button
                        type="button"
                        onClick={() => setDpi(300)}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-colors text-center ${
                          dpi === 300
                            ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                            : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        300
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Adjustments & Fine Tuning */}
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sliders size={16} className="text-brand-500" />
                Adjustments
              </h3>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-[11px] font-bold text-slate-500">Brightness</label>
                  <span className="text-xs font-bold text-brand-500">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-[11px] font-bold text-slate-500">Contrast</label>
                  <span className="text-xs font-bold text-brand-500">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-[11px] font-bold text-slate-500">Fine Rotation</label>
                  <span className="text-xs font-bold text-brand-500">{rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-850">
                <span className="text-[11px] font-bold text-slate-500">Black & White Effect</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGrayscale}
                    onChange={(e) => setIsGrayscale(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={triggerCrop}
                disabled={isProcessing}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Crop size={14} />
                <span>Crop Selected Region</span>
              </button>

              {croppedUrl && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                    <img
                      src={croppedUrl}
                      alt="Cropped Output"
                      className="max-h-[180px] object-contain rounded border border-slate-200 dark:border-slate-800 shadow-sm"
                    />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
                      <Check size={12} />
                      High-Resolution Crop Applied ({croppedSizeKb} KB)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download size={14} />
                    Download HD Cropped Image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCropper;
