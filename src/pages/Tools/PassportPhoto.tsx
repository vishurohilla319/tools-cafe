import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { Download, Sliders, LayoutGrid, RotateCw, ZoomIn, ZoomOut, Check } from 'lucide-react';
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

  // Output configuration
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
      setImageObj(img);
    };
  };

  // Re-draw preview canvas when parameters change
  useEffect(() => {
    if (!imageObj || !workspaceCanvasRef.current) return;

    const canvas = workspaceCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Set filters
    let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (isGrayscale) filterString += ' grayscale(100%)';
    ctx.filter = filterString;

    // Center of workspace
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.translate(centerX + offsetX, centerY + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate dimensions to fit target
    // We want the image to fit the crop box initially
    const cropWidth = 210;
    const cropHeight = 270;
    const imgRatio = imageObj.width / imageObj.height;
    const cropRatio = cropWidth / cropHeight;

    let drawWidth = cropWidth;
    let drawHeight = cropHeight;

    if (imgRatio > cropRatio) {
      // Image is wider than crop box
      drawWidth = cropHeight * imgRatio;
    } else {
      // Image is taller than crop box
      drawHeight = cropWidth / imgRatio;
    }

    // Apply zoom
    drawWidth *= zoom;
    drawHeight *= zoom;

    // Draw image centered on current transform origin
    ctx.drawImage(imageObj, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    
    ctx.restore();
  }, [imageObj, zoom, offsetX, offsetY, brightness, contrast, isGrayscale, rotation]);

  // Drag interaction handlers
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

  // Touch handlers for mobile
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

  const generatePrintSheet = async () => {
    if (!imageObj) return;
    setIsProcessing(true);
    setProgress(20);

    try {
      // 1. Create a high-res cropped version of the image matching 3.5cm x 4.5cm at 300 DPI (413 x 531 pixels)
      const cropWidth = 413;
      const cropHeight = 531;
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = cropWidth;
      renderCanvas.height = cropHeight;
      const rCtx = renderCanvas.getContext('2d');

      if (!rCtx) throw new Error('Canvas render context failed');

      rCtx.save();
      
      // Apply color filters
      let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
      if (isGrayscale) filterString += ' grayscale(100%)';
      rCtx.filter = filterString;

      // Translate workspace coordinates to high-res render coordinates
      // scale difference: renderCanvas (413x531) vs crop frame (210x270)
      const scaleMult = cropWidth / 210;

      const rCenterX = cropWidth / 2;
      const rCenterY = cropHeight / 2;

      // Apply the same offsets scaled up
      rCtx.translate(rCenterX + offsetX * scaleMult, rCenterY + offsetY * scaleMult);
      rCtx.rotate((rotation * Math.PI) / 180);

      // Draw original image size matching high-res crop ratio
      const imgRatio = imageObj.width / imageObj.height;
      const cropRatio = 210 / 270;

      let drawWidth = cropWidth;
      let drawHeight = cropHeight;

      if (imgRatio > cropRatio) {
        drawWidth = cropHeight * imgRatio;
      } else {
        drawHeight = cropWidth / imgRatio;
      }

      drawWidth *= zoom;
      drawHeight *= zoom;

      // Draw image centered
      rCtx.drawImage(imageObj, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      rCtx.restore();

      setProgress(50);

      // 2. Export crop as JPEG blob
      const croppedDataUrl = renderCanvas.toDataURL('image/jpeg', 0.95);
      
      // 3. Setup pdf-lib document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.27, 841.89]); // A4 Size in points
      
      // Load cropped image
      const imageBytes = await fetch(croppedDataUrl).then((r) => r.arrayBuffer());
      const embeddedImg = await pdfDoc.embedJpg(imageBytes);

      setProgress(75);

      // Layout coordinates calculation
      // Standard A4: 595.27 x 841.89 pt
      // Passport Size: 35 x 45 mm -> 99.2 x 127.5 pt
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
      
      // Row parameters
      const totalRows = Math.ceil(copies / cols);
      const totalRowsHeight = totalRows * photoH + (totalRows - 1) * rowGap;
      const startY = 841.89 - 150 - totalRowsHeight; // place it in upper half of A4 sheet

      for (let i = 0; i < copies; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const x = startX + col * (photoW + colGap);
        // pdf-lib y-axis starts from bottom
        const y = startY + (totalRows - 1 - row) * (photoH + rowGap);

        // Draw image copy
        page.drawImage(embeddedImg, {
          x,
          y,
          width: photoW,
          height: photoH
        });

        // Draw light grey cutting guidelines around each photo (border)
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Interactive Crop & Filters Workspace
              </h3>
              <button
                onClick={clearTool}
                className="text-[10px] text-slate-450 hover:text-brand-500 font-bold hover:underline"
              >
                Upload Different Photo
              </button>
            </div>

            {/* Editor workspace */}
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden select-none">
              
              {/* Crop Box Overlay guide */}
              <div className="relative w-[210px] h-[270px] rounded-sm overflow-hidden border-2 border-brand-500 shadow-2xl z-10 pointer-events-none">
                {/* 3x3 crop grids */}
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

              {/* Working Canvas (drawn in background) */}
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
                className="absolute inset-0 w-full h-full cursor-move object-contain"
                title="Drag to position your face inside the red boundary"
              />

              <div className="absolute bottom-3 right-3 text-[9px] font-bold text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded pointer-events-none">
                Drag to position face inside box
              </div>
            </div>

            {/* Quick helper controls */}
            <div className="flex justify-center gap-4 border-t border-slate-100 dark:border-slate-850 pt-4">
              <button
                onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
                className="p-2 rounded-lg bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-brand-500 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
                className="p-2 rounded-lg bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-brand-500 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-lg bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-brand-500 transition-colors"
                title="Rotate 90°"
              >
                <RotateCw size={16} />
              </button>
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              
              {/* Core sliders */}
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <Sliders size={16} className="text-brand-500" />
                <span>Image Adjustments</span>
              </h3>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                {/* Brightness */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label>Brightness</label>
                    <span className="font-bold text-brand-650">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={brightness}
                    onChange={(e) => { setBrightness(parseInt(e.target.value)); setPdfBlobUrl(null); }}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label>Contrast</label>
                    <span className="font-bold text-brand-650">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={contrast}
                    onChange={(e) => { setContrast(parseInt(e.target.value)); setPdfBlobUrl(null); }}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                {/* Grayscale Toggle */}
                <div className="flex items-center justify-between py-2 border-t border-b border-slate-100 dark:border-slate-850">
                  <label className="cursor-pointer" htmlFor="grayscale-toggle">
                    Grayscale Output (B&W)
                  </label>
                  <input
                    id="grayscale-toggle"
                    type="checkbox"
                    checked={isGrayscale}
                    onChange={(e) => { setIsGrayscale(e.target.checked); setPdfBlobUrl(null); }}
                    className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Sheet copies selector */}
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4 flex items-center gap-2">
                <LayoutGrid size={16} className="text-brand-500" />
                <span>A4 Layout Settings</span>
              </h3>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                <div className="space-y-1.5">
                  <label>Copies Count</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[4, 6, 8, 12].map((num) => (
                      <button
                        key={num}
                        onClick={() => { setCopies(num); setPdfBlobUrl(null); }}
                        className={`py-1.5 rounded-lg border text-center font-bold text-[10px] ${
                          copies === num
                            ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {num} Photos
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compile and Download buttons */}
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
                {isProcessing && <ProgressBar progress={progress} statusText="Creating grid layout..." />}

                {pdfBlobUrl ? (
                  <div className="space-y-2">
                    <a
                      href={pdfBlobUrl}
                      download={`passport_sheet_${copies}_copies_${Date.now()}.pdf`}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                    >
                      <Download size={15} />
                      <span>Download Print PDF</span>
                    </a>
                    
                    <button
                      onClick={() => {
                        const win = window.open(pdfBlobUrl);
                        win?.print();
                      }}
                      className="w-full py-3 rounded-xl border border-slate-250 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Print Sheet</span>
                    </button>

                    <button
                      onClick={() => setPdfBlobUrl(null)}
                      className="w-full text-center text-[10px] font-bold text-slate-400 hover:underline"
                    >
                      Re-crop and Adjust
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={generatePrintSheet}
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                  >
                    <Check size={14} />
                    <span>Generate Print Sheet</span>
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
