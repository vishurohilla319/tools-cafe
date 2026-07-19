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

export const ImageCropper: React.FC = () => {
  const { t } = useLanguage();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [originalSizeKb, setOriginalSizeKb] = useState<number>(0);

  // Crop Box & Drag States
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioPreset>(ASPECT_RATIO_PRESETS[1]); // Default to 1:1
  const [cropW, setCropW] = useState<number>(220);
  const [cropH, setCropH] = useState<number>(220);

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

  // Adjust Crop Box dimensions when preset changes
  useEffect(() => {
    if (selectedRatio.ratio === 'free') {
      setCropW(selectedRatio.width);
      setCropH(selectedRatio.height);
    } else {
      const workspaceW = 320;
      const workspaceH = 260;
      const r = selectedRatio.ratio;

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
  }, [selectedRatio]);

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

      // Cropped output canvas sizes
      const outputW = Math.round(cropW * resScale);
      const outputH = Math.round(cropH * resScale);

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

      // Draw high resolution image centered and relative to user workspace inputs
      rCtx.translate(outputW / 2 + offsetX * resScale, outputH / 2 + offsetY * resScale);
      rCtx.rotate((rotation * Math.PI) / 180);

      rCtx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2, imageObj.width, imageObj.height);

      // Export
      renderCanvas.toBlob(
        (blob) => {
          if (blob) {
            if (croppedUrl) URL.revokeObjectURL(croppedUrl);
            setCroppedBlob(blob);
            setCroppedUrl(URL.createObjectURL(blob));
            setCroppedSizeKb(Math.round(blob.size / 1024));
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
            {/* Aspect Ratio Panel */}
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileImage size={16} className="text-brand-500" />
                Aspect Ratio
              </h3>
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
