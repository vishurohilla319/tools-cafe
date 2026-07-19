import React, { useState, useEffect, useRef } from 'react';
import { Download, Crop, RotateCw, ZoomIn, ZoomOut, Check, RefreshCw, Sliders, FileImage } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import { useLanguage } from '../../context/LanguageContext';

type AspectRatioPreset = {
  name: string;
  ratio: number | 'free';
  width: number;
  height: number;
};

const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { name: 'Free', ratio: 'free', width: 240, height: 180 },
  { name: '1:1 (Square)', ratio: 1, width: 220, height: 220 },
  { name: '16:9 (Cinematic)', ratio: 16 / 9, width: 288, height: 162 },
  { name: '4:3 (Standard)', ratio: 4 / 3, width: 256, height: 192 },
  { name: '3:2 (Classic)', ratio: 3 / 2, width: 264, height: 176 },
  { name: '2:3 (Portrait)', ratio: 2 / 3, width: 176, height: 264 },
  { name: '9:16 (Vertical)', ratio: 9 / 16, width: 162, height: 288 }
];

// Helper to change/inject DPI in JPEG JFIF header
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
      // Verify JPEG SOI (0xFFD8)
      if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
        resolve(blob);
        return;
      }
      
      let offset = 2;
      while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset);
        if (marker === 0xFFE0) {
          // Found APP0 (JFIF)
          const length = view.getUint16(offset + 2);
          if (offset + 2 + length <= view.byteLength && length >= 14) {
            // Check for "JFIF\0" identifier
            if (
              view.getUint8(offset + 4) === 0x4A && // 'J'
              view.getUint8(offset + 5) === 0x46 && // 'F'
              view.getUint8(offset + 6) === 0x49 && // 'I'
              view.getUint8(offset + 7) === 0x46 && // 'F'
              view.getUint8(offset + 8) === 0x00    // '\0'
            ) {
              // Set density unit to 1 (dots per inch)
              view.setUint8(offset + 13, 1);
              // Set X density
              view.setUint16(offset + 14, dpi);
              // Set Y density
              view.setUint16(offset + 16, dpi);
              
              resolve(new Blob([buffer], { type: 'image/jpeg' }));
              return;
            }
          }
          offset += length + 2;
        } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFFD8 && marker !== 0xFFD9) {
          // Other marker, skip it
          const length = view.getUint16(offset + 2);
          offset += length + 2;
        } else {
          break;
        }
      }
      
      // If APP0 marker is not found, insert one right after SOI
      const app0Segment = new Uint8Array([
        0xFF, 0xE0, // APP0 marker
        0x00, 0x10, // length = 16
        0x4A, 0x46, 0x49, 0x46, 0x00, // JFIF\0
        0x01, 0x01, // version 1.01
        0x01,       // density units (1 = DPI)
        (dpi >> 8) & 0xFF, dpi & 0xFF, // X density
        (dpi >> 8) & 0xFF, dpi & 0xFF, // Y density
        0x00, 0x00  // thumbnail width/height
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

  // Crop Box & Drag States
  const [cropMode, setCropMode] = useState<'preset' | 'custom-cm'>('preset');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioPreset>(ASPECT_RATIO_PRESETS[1]); // Default to 1:1
  const [cropW, setCropW] = useState<number>(220);
  const [cropH, setCropH] = useState<number>(220);

  // Custom cm & DPI states
  const [widthCm, setWidthCm] = useState<number>(3.5);
  const [heightCm, setHeightCm] = useState<number>(4.5);
  const [dpi, setDpi] = useState<number>(300);

  // Zoom, pan, rotate
  const [zoom, setZoom] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);

  // Adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);

  // Outputs
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [croppedSizeKb, setCroppedSizeKb] = useState<number>(0);

  // Canvas Refs
  const workspaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle files selected
  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];

    // Clean up old URLs
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);

    const url = URL.createObjectURL(file);
    setOriginalFile(file);
    setOriginalSizeKb(Math.round(file.size / 1024));
    setOriginalUrl(url);

    // Reset settings & output
    setCroppedBlob(null);
    setCroppedUrl(null);
    setCroppedSizeKb(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setIsGrayscale(false);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImageObj(img);
    };
  };

  // Adjust Crop Box dimensions when preset or custom cm settings change
  useEffect(() => {
    const workspaceW = 320;
    const workspaceH = 260;

    if (cropMode === 'preset') {
      if (selectedRatio.ratio === 'free') {
        setCropW(selectedRatio.width);
        setCropH(selectedRatio.height);
      } else {
        const r = selectedRatio.ratio;
        if (r > workspaceW / workspaceH) {
          setCropW(workspaceW);
          setCropH(Math.round(workspaceW / r));
        } else {
          setCropH(workspaceH);
          setCropW(Math.round(workspaceH * r));
        }
      }
    } else {
      // custom-cm mode
      const w = Math.max(0.1, widthCm);
      const h = Math.max(0.1, heightCm);
      const r = w / h;
      if (r > workspaceW / workspaceH) {
        setCropW(workspaceW);
        setCropH(Math.round(workspaceW / r));
      } else {
        setCropH(workspaceH);
        setCropW(Math.round(workspaceH * r));
      }
    }
    // Reset offset and zoom to avoid weird positioning
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1);
    setCroppedUrl(null);
    setCroppedBlob(null);
  }, [cropMode, selectedRatio, widthCm, heightCm]);

  // Re-draw workspace preview canvas
  useEffect(() => {
    if (!imageObj || !workspaceCanvasRef.current) return;

    const canvas = workspaceCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // Apply adjustments
    let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (isGrayscale) filterString += ' grayscale(100%)';
    ctx.filter = filterString;

    // Center workspace coords
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.translate(centerX + offsetX, centerY + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate baseline fitting scale
    const baseScale = Math.min(canvas.width / imageObj.width, canvas.height / imageObj.height);
    const drawWidth = imageObj.width * baseScale * zoom;
    const drawHeight = imageObj.height * baseScale * zoom;

    // Draw centering
    ctx.drawImage(imageObj, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();
  }, [imageObj, zoom, offsetX, offsetY, rotation, brightness, contrast, isGrayscale]);

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageObj) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !imageObj) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffsetX((prev) => prev + dx);
    setOffsetY((prev) => prev + dy);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!imageObj || e.touches.length === 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !imageObj || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffsetX((prev) => prev + dx);
    setOffsetY((prev) => prev + dy);
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  // Execute cropping logic on high-res canvas
  const triggerCrop = async () => {
    if (!imageObj || !workspaceCanvasRef.current) return;
    setIsProcessing(true);

    try {
      const workspaceCanvas = workspaceCanvasRef.current;
      const baseScale = Math.min(workspaceCanvas.width / imageObj.width, workspaceCanvas.height / imageObj.height);
      
      // Calculate resolution multiplier mapping workspace to original dimensions
      const resScale = imageObj.width / (imageObj.width * baseScale * zoom);

      let outputW: number;
      let outputH: number;
      let drawScale: number;

      if (cropMode === 'preset') {
        outputW = Math.round(cropW * resScale);
        outputH = Math.round(cropH * resScale);
        drawScale = resScale;
      } else {
        outputW = Math.round((widthCm / 2.54) * dpi);
        outputH = Math.round((heightCm / 2.54) * dpi);
        drawScale = outputW / cropW;
      }

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = outputW;
      renderCanvas.height = outputH;
      const rCtx = renderCanvas.getContext('2d');
      if (!rCtx) throw new Error('Could not create output canvas context');

      rCtx.imageSmoothingEnabled = true;
      rCtx.imageSmoothingQuality = 'high';

      // Apply filters
      let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
      if (isGrayscale) filterString += ' grayscale(100%)';
      rCtx.filter = filterString;

      // Draw image centered and scaled
      rCtx.translate(outputW / 2 + offsetX * drawScale, outputH / 2 + offsetY * drawScale);
      rCtx.rotate((rotation * Math.PI) / 180);

      const drawW = imageObj.width * baseScale * zoom * drawScale;
      const drawH = imageObj.height * baseScale * zoom * drawScale;
      rCtx.drawImage(imageObj, -drawW / 2, -drawH / 2, drawW, drawH);

      // Export
      renderCanvas.toBlob(
        async (blob) => {
          if (blob) {
            let finalBlob = blob;
            if (cropMode === 'custom-cm') {
              finalBlob = await changeDpiInJpeg(blob, dpi);
            }
            if (croppedUrl) URL.revokeObjectURL(croppedUrl);
            setCroppedBlob(finalBlob);
            setCroppedUrl(URL.createObjectURL(finalBlob));
            setCroppedSizeKb(Math.round(finalBlob.size / 1024));
          }
          setIsProcessing(false);
        },
        'image/jpeg',
        0.95
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
    link.href = URL.createObjectURL(croppedBlob);
    link.download = `${baseName}_cropped.${selectedRatio.ratio === 'free' ? 'jpg' : 'jpg'}`;
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
            label="Upload an image to crop"
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Interactive Workspace */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Interactive Workspace {originalSizeKb > 0 ? `(Original: ${originalSizeKb} KB)` : ''}
              </span>
              <button
                onClick={clearTool}
                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                Upload New
              </button>
            </div>

            {/* Visual Canvas and Mask overlay */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 min-h-[380px] relative overflow-hidden select-none">
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/70 z-20 flex flex-col items-center justify-center text-white p-4 text-center">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-bold">Cropping image...</p>
                </div>
              )}

              {/* Crop Cutout Overlay (Dynamic sizing depending on Aspect Ratio) */}
              <div
                style={{ width: `${cropW}px`, height: `${cropH}px` }}
                className="absolute rounded-sm overflow-hidden border-2 border-brand-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] z-10 pointer-events-none transition-all duration-200 ease-out"
              >
                {/* 3x3 Grid Overlay */}
                <div className="absolute inset-0 grid grid-cols-3 divide-x divide-white/20">
                  <div />
                  <div />
                  <div />
                </div>
                <div className="absolute inset-0 grid grid-rows-3 divide-y divide-white/20">
                  <div />
                  <div />
                  <div />
                </div>
              </div>

              {/* Interaction Workspace Canvas */}
              <canvas
                ref={workspaceCanvasRef}
                width={360}
                height={320}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="absolute inset-0 w-full h-full cursor-move object-contain"
                title="Drag to reposition, use sliders below to adjust zoom & details"
              />

              <div className="absolute bottom-3 right-3 text-[9px] font-bold text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded pointer-events-none z-10">
                Drag to reposition photo
              </div>
            </div>

            {/* Quick adjust tools */}
            <div className="flex justify-center gap-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
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
            {/* Aspect Ratio & Custom Size Panel */}
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
                <FileImage size={16} className="text-brand-500" />
                Crop Dimension Options
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
                  Aspect Ratio Presets
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
                <>
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

                  {selectedRatio.ratio === 'free' && (
                    <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-850">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[11px] font-bold text-slate-500">Crop Box Width</label>
                          <span className="text-[11px] font-bold text-brand-500">{cropW}px</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="320"
                          value={cropW}
                          onChange={(e) => setCropW(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[11px] font-bold text-slate-500">Crop Box Height</label>
                          <span className="text-[11px] font-bold text-brand-500">{cropH}px</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="260"
                          value={cropH}
                          onChange={(e) => setCropH(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                        />
                      </div>
                    </div>
                  )}
                </>
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
                        key="dpi-150"
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
                        key="dpi-300"
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

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-850 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Resulting Output Size
                    </div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                      {Math.round((widthCm / 2.54) * dpi)} × {Math.round((heightCm / 2.54) * dpi)} px
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

              {/* Brightness */}
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

              {/* Contrast */}
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

              {/* Fine rotation slider */}
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

              {/* Grayscale Toggle */}
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
                className="w-full py-3 bg-brand-500 hover:bg-brand-650 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Crop size={14} />
                Crop Image
              </button>

              {croppedUrl && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                    <img
                      src={croppedUrl}
                      alt="Cropped Output"
                      className="max-h-[160px] object-contain rounded border border-slate-200 dark:border-slate-800 shadow-sm"
                    />
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-2 flex items-center gap-1">
                      <Check size={12} />
                      Crop applied! Output size: {croppedSizeKb} KB
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download size={14} />
                    Download Cropped Image
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
