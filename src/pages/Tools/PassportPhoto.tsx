import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  Download,
  Sliders,
  LayoutGrid,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  Sun,
  Contrast,
  SlidersHorizontal
} from 'lucide-react';

import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

export const PassportPhoto: React.FC = () => {
  const { t } = useLanguage();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Canvas Workspace States
  const [zoom, setZoom] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);

  // Layout & Output States
  const [copies, setCopies] = useState<number>(8); // 4, 6, 8, 12
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // References
  const workspaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setImageFile(file);
    
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Reset controls
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setBrightness(100);
    setContrast(100);
    setIsGrayscale(false);
    setRotation(0);
    setPdfBlobUrl(null);

    // Load Image Object
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const maxDim = 1200;
      if (img.width > maxDim || img.height > maxDim) {
        const scale = Math.min(maxDim / img.width, maxDim / img.height);
        const scaleCanvas = document.createElement('canvas');
        scaleCanvas.width = Math.round(img.width * scale);
        scaleCanvas.height = Math.round(img.height * scale);
        const sCtx = scaleCanvas.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(img, 0, 0, scaleCanvas.width, scaleCanvas.height);
          const scaledImg = new Image();
          scaledImg.src = scaleCanvas.toDataURL('image/png');
          scaledImg.onload = () => {
            setImageObj(scaledImg);
          };
          return;
        }
      }
      setImageObj(img);
    };
  };

  // Main Canvas Rendering Routine
  const renderCompositeCanvas = useCallback((
    targetWidth: number,
    targetHeight: number,
    isExportMode: boolean = false
  ): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageObj) return canvas;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const cropWidth = isExportMode ? targetWidth : 210;
    const cropHeight = isExportMode ? targetHeight : 270;
    const scaleMult = isExportMode ? (targetWidth / 210) : 1;

    ctx.save();

    // Filters
    let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (isGrayscale) filterString += ' grayscale(100%)';
    ctx.filter = filterString;

    ctx.translate(centerX + offsetX * scaleMult, centerY + offsetY * scaleMult);
    ctx.rotate((rotation * Math.PI) / 180);

    const imgRatio = imageObj.width / imageObj.height;
    const cropRatio = cropWidth / cropHeight;

    let drawWidth = cropWidth;
    let drawHeight = cropHeight;

    if (imgRatio > cropRatio) {
      drawWidth = cropHeight * imgRatio;
    } else {
      drawHeight = cropWidth / imgRatio;
    }

    drawWidth *= zoom;
    drawHeight *= zoom;

    ctx.drawImage(imageObj, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();
    return canvas;
  }, [imageObj, brightness, contrast, isGrayscale, offsetX, offsetY, rotation, zoom]);

  // Re-draw workspace preview canvas on state change
  useEffect(() => {
    if (!imageObj || !workspaceCanvasRef.current) return;

    const workspaceCanvas = workspaceCanvasRef.current;
    const ctx = workspaceCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, workspaceCanvas.width, workspaceCanvas.height);

    const compositeCanvas = renderCompositeCanvas(workspaceCanvas.width, workspaceCanvas.height, false);
    ctx.drawImage(compositeCanvas, 0, 0);

  }, [imageObj, workspaceCanvasRef, renderCompositeCanvas]);

  // Mouse & Touch Drag Handlers
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

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!imageObj || e.touches.length !== 1) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !imageObj || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffsetX((prev) => prev + dx);
    setOffsetY((prev) => prev + dy);
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  // Direct Single HD Photo Download (PNG/JPG)
  const downloadSinglePhoto = (format: 'png' | 'jpeg') => {
    if (!imageObj) return;
    const renderCanvas = renderCompositeCanvas(413, 531, true);
    
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = renderCanvas.toDataURL(mimeType, 0.95);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `passport_photo_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Generate A4 Print Sheet PDF
  const generatePrintSheet = async () => {
    if (!imageObj) return;
    setIsProcessing(true);
    setProgress(20);

    try {
      const cropWidth = 413;
      const cropHeight = 531;
      const renderCanvas = renderCompositeCanvas(cropWidth, cropHeight, true);

      setProgress(50);

      const croppedDataUrl = renderCanvas.toDataURL('image/png');
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.27, 841.89]);
      
      const imageBytes = await fetch(croppedDataUrl).then((r) => r.arrayBuffer());
      const embeddedImg = await pdfDoc.embedPng(imageBytes);

      setProgress(75);

      const photoW = 99.2;
      const photoH = 127.5;

      let cols = 4;
      let colGap = 15;
      let rowGap = 15;
      
      if (copies === 6) {
        cols = 3;
        colGap = 25;
      }

      const totalColsWidth = cols * photoW + (cols - 1) * colGap;
      const startX = (595.27 - totalColsWidth) / 2;
      
      const totalRows = Math.ceil(copies / cols);
      const totalRowsHeight = totalRows * photoH + (totalRows - 1) * rowGap;
      const startY = 841.89 - 150 - totalRowsHeight;

      for (let i = 0; i < copies; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const x = startX + col * (photoW + colGap);
        const y = startY + (totalRows - 1 - row) * (photoH + rowGap);

        page.drawImage(embeddedImg, {
          x,
          y,
          width: photoW,
          height: photoH
        });

        page.drawRectangle({
          x: x - 0.5,
          y: y - 0.5,
          width: photoW + 1,
          height: photoH + 1,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.5
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error generating passport print sheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearTool = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);

    setImageFile(null);
    setImageUrl(null);
    setImageObj(null);
    setPdfBlobUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="passport-photo"
        title={t('tool.passport.title')}
        description={t('tool.passport.desc')}
        category="photo"
        categoryName="Photo Tools"
      />

      {!imageFile ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept="image/*"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload Portrait Photo"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Interactive Workspace (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Passport Preview & Face Alignment
              </h3>
              <button
                onClick={clearTool}
                className="text-xs text-slate-500 hover:text-brand-600 font-bold hover:underline"
              >
                Upload Different Photo
              </button>
            </div>

            {/* Canvas Workspace Viewport */}
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden select-none min-h-[420px] bg-slate-900/10 dark:bg-slate-950/60">
              
              {/* Crop Overlay Guide (3.5cm x 4.5cm standard) */}
              <div className="relative w-[210px] h-[270px] rounded-sm border-2 border-brand-500 shadow-2xl z-10 pointer-events-none ring-4 ring-black/20">
                <div className="absolute inset-0 grid grid-cols-3 divide-x divide-white/20">
                  <div /><div /><div />
                </div>
                <div className="absolute inset-0 grid grid-rows-3 divide-y divide-white/20">
                  <div /><div /><div />
                </div>
                <div className="absolute inset-x-8 top-6 bottom-12 border-2 border-dashed border-brand-400/40 rounded-full opacity-60 pointer-events-none" />
              </div>

              {/* Interactive Canvas */}
              <canvas
                ref={workspaceCanvasRef}
                width={360}
                height={400}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="absolute inset-0 w-full h-full object-contain cursor-move"
              />

              <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-md pointer-events-none flex items-center gap-1.5 border border-white/10">
                <SlidersHorizontal size={12} />
                <span>Drag photo to align face inside red frame</span>
              </div>
            </div>

            {/* Quick Controls & Download Options */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
                  className="p-2.5 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-600 hover:border-brand-500 transition-all shadow-sm"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(4, z + 0.1))}
                  className="p-2.5 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-600 hover:border-brand-500 transition-all shadow-sm"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2.5 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-600 hover:border-brand-500 transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
                  title="Rotate 90°"
                >
                  <RotateCw size={16} />
                  <span>Rotate</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => downloadSinglePhoto('png')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download size={14} />
                  <span>Single PNG</span>
                </button>
                <button
                  onClick={() => downloadSinglePhoto('jpeg')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download size={14} />
                  <span>Single JPG</span>
                </button>
              </div>
            </div>

          </div>

          {/* Settings Sidebar (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-6">
              
              {/* SECTION 1: Image Adjustments */}
              <div>
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                  <Sliders size={14} className="text-brand-500" />
                  <span>1. Image Adjustments</span>
                </h3>

                <div className="space-y-3 text-xs font-semibold text-slate-650 dark:text-slate-350">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="flex items-center gap-1">
                        <Sun size={13} className="text-amber-500" />
                        <span>Brightness</span>
                      </label>
                      <span className="font-bold text-brand-600">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      value={brightness}
                      onChange={(e) => { setBrightness(parseInt(e.target.value)); setPdfBlobUrl(null); }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="flex items-center gap-1">
                        <Contrast size={13} className="text-indigo-500" />
                        <span>Contrast</span>
                      </label>
                      <span className="font-bold text-brand-600">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      value={contrast}
                      onChange={(e) => { setContrast(parseInt(e.target.value)); setPdfBlobUrl(null); }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="cursor-pointer font-bold text-slate-700 dark:text-slate-300" htmlFor="grayscale-toggle">
                      Black & White Output
                    </label>
                    <input
                      id="grayscale-toggle"
                      type="checkbox"
                      checked={isGrayscale}
                      onChange={(e) => { setIsGrayscale(e.target.checked); setPdfBlobUrl(null); }}
                      className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: A4 Print Sheet Layout */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                  <LayoutGrid size={14} className="text-brand-500" />
                  <span>2. A4 Print Sheet Layout</span>
                </h3>

                <div className="grid grid-cols-4 gap-1.5">
                  {[4, 6, 8, 12].map((num) => (
                    <button
                      key={num}
                      onClick={() => { setCopies(num); setPdfBlobUrl(null); }}
                      className={`py-2 rounded-xl border text-center font-bold text-xs transition-all ${
                        copies === num
                          ? 'border-brand-500 bg-brand-500/10 text-brand-600 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      {num} Copies
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Generate & Download Actions */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
                {isProcessing && <ProgressBar progress={progress} statusText="Generating A4 print layout..." />}

                {pdfBlobUrl ? (
                  <div className="space-y-2">
                    <a
                      href={pdfBlobUrl}
                      download={`passport_sheet_${copies}_copies_${Date.now()}.pdf`}
                      className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all hover:scale-[1.01]"
                    >
                      <Download size={16} />
                      <span>Download Print PDF</span>
                    </a>
                    
                    <button
                      onClick={() => {
                        const win = window.open(pdfBlobUrl);
                        win?.print();
                      }}
                      className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Print Directly</span>
                    </button>

                    <button
                      onClick={() => setPdfBlobUrl(null)}
                      className="w-full text-center text-xs font-bold text-slate-400 hover:underline pt-1"
                    >
                      Adjust Layout & Crop Again
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={generatePrintSheet}
                    disabled={isProcessing || !imageObj}
                    className="w-full py-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.01]"
                  >
                    <Check size={16} />
                    <span>Generate A4 Print Sheet ({copies} Copies)</span>
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default PassportPhoto;
