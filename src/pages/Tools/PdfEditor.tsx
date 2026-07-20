import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import { 
  Download, 
  Image as ImageIcon, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight,
  Move,
  Upload
} from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PlacedImageOverlay {
  id: string;
  pageNumber: number; // Page number (1-indexed) or -1 for All Pages
  fileName: string;
  dataUrl: string;
  mimeType: 'image/png' | 'image/jpeg';
  widthPct: number; // % of page width
  heightPct: number; // % of page height (derived from aspect ratio)
  aspectRatio: number; // naturalWidth / naturalHeight
  xPct: number; // % from left of page
  yPct: number; // % from top of page
  opacity: number; // 0.1 to 1.0
}

export const PdfEditor: React.FC = () => {
  // PDF Document States
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [renderScale, setRenderScale] = useState<number>(1.2);

  // PDF.js references
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Image Overlays
  const [imageOverlays, setImageOverlays] = useState<PlacedImageOverlay[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Processing & Export Progress
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [loadingText, setLoadingText] = useState<string>('');

  // Handle PDF Upload
  const handlePdfSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    setImageOverlays([]);
    setSelectedImageId(null);
    setCurrentPage(1);

    const buffer = await file.arrayBuffer();
    setArrayBuffer(buffer);

    try {
      setIsProcessing(true);
      setLoadingText('Loading PDF document...');
      // Pass sliced clone (buffer.slice(0)) to prevent ArrayBuffer detachment in main thread
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Error loading PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render Current Page onto Canvas
  const renderCurrentPage = async () => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const viewport = page.getViewport({ scale: renderScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport, canvas }).promise;
    } catch (err) {
      console.error('Page render error:', err);
    }
  };

  useEffect(() => {
    if (pdfDocRef.current) {
      renderCurrentPage();
    }
  }, [currentPage, renderScale, pdfDocRef.current]);

  // Handle Image Upload with Natural Aspect Ratio Calculation
  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const mime = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      const reader = new FileReader();

      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        if (!dataUrl) return;

        // Calculate Natural Aspect Ratio of uploaded image
        const imgObj = new Image();
        imgObj.src = dataUrl;
        imgObj.onload = () => {
          const naturalW = imgObj.naturalWidth || 200;
          const naturalH = imgObj.naturalHeight || 200;
          const aspectRatio = naturalW / naturalH;

          // Default initial width % (25% of page width)
          const widthPct = 25;
          const heightPct = Math.round(widthPct / aspectRatio);

          const newOverlay: PlacedImageOverlay = {
            id: 'img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            pageNumber: currentPage,
            fileName: file.name,
            dataUrl,
            mimeType: mime,
            widthPct,
            heightPct,
            aspectRatio,
            xPct: 35, // Centered default X
            yPct: 35, // Centered default Y
            opacity: 1.0
          };

          setImageOverlays((prev) => [...prev, newOverlay]);
          setSelectedImageId(newOverlay.id);
        };
      };

      reader.readAsDataURL(file);
    });
  };

  // Handle Drag-to-Move Image on Canvas
  const handleImageMoveStart = (e: React.MouseEvent, imgId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const startX = e.clientX;
    const startY = e.clientY;

    const img = imageOverlays.find((i) => i.id === imgId);
    if (!img) return;

    setSelectedImageId(imgId);

    const startXPct = img.xPct;
    const startYPct = img.yPct;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dxPx = moveEvent.clientX - startX;
      const dyPx = moveEvent.clientY - startY;

      const dxPct = (dxPx / canvasRect.width) * 100;
      const dyPct = (dyPx / canvasRect.height) * 100;

      const newXPct = Math.round(Math.max(0, Math.min(95, startXPct + dxPct)));
      const newYPct = Math.round(Math.max(0, Math.min(95, startYPct + dyPct)));

      setImageOverlays((prev) =>
        prev.map((item) =>
          item.id === imgId ? { ...item, xPct: newXPct, yPct: newYPct } : item
        )
      );
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle Interactive Corner Drag Resizing Preserving Exact Aspect Ratio & Position
  const handleImageResizeStart = (
    e: React.MouseEvent,
    imgId: string,
    corner: 'se' | 'sw' | 'ne' | 'nw'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const startX = e.clientX;
    const startY = e.clientY;

    const img = imageOverlays.find((i) => i.id === imgId);
    if (!img) return;

    const startW = img.widthPct;
    const startXPct = img.xPct;
    const startYPct = img.yPct;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dxPx = moveEvent.clientX - startX;
      const dyPx = moveEvent.clientY - startY;

      const dxPct = (dxPx / canvasRect.width) * 100;
      const dyPct = (dyPx / canvasRect.height) * 100;

      setImageOverlays((prev) =>
        prev.map((item) => {
          if (item.id !== imgId) return item;

          let newW = startW;
          let newX = startXPct;
          let newY = startYPct;

          if (corner === 'se') {
            newW = Math.max(5, Math.min(95, startW + dxPct));
          } else if (corner === 'sw') {
            newW = Math.max(5, Math.min(95, startW - dxPct));
            newX = Math.max(0, Math.min(95, startXPct + (startW - newW)));
          } else if (corner === 'ne') {
            newW = Math.max(5, Math.min(95, startW + dxPct));
            const newH = newW / img.aspectRatio;
            const startH = startW / img.aspectRatio;
            newY = Math.max(0, Math.min(95, startYPct - (newH - startH)));
          } else if (corner === 'nw') {
            newW = Math.max(5, Math.min(95, startW - dxPct));
            newX = Math.max(0, Math.min(95, startXPct + (startW - newW)));
            const newH = newW / img.aspectRatio;
            const startH = startW / img.aspectRatio;
            newY = Math.max(0, Math.min(95, startYPct - (newH - startH)));
          }

          const roundedW = Math.round(newW);

          return {
            ...item,
            widthPct: roundedW,
            heightPct: Math.round(roundedW / item.aspectRatio),
            xPct: Math.round(newX),
            yPct: Math.round(newY)
          };
        })
      );
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Remove Image Overlay
  const handleRemoveImage = (id: string) => {
    setImageOverlays((prev) => prev.filter((img) => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
  };

  // Export PDF with 100% Pixel-Perfect Aspect-Ratio and Alignment Matching
  const handleExportPdf = async () => {
    if (!arrayBuffer || !pdfFile) return;

    if (imageOverlays.length === 0) {
      alert('Please upload and place at least one image into the PDF before downloading.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setLoadingText('Preparing PDF document...');

    try {
      // Safe sliced arrayBuffer clone to prevent ArrayBuffer detachment error
      const pdfDoc = await PDFDocument.load(arrayBuffer.slice(0));
      const pages = pdfDoc.getPages();

      setProgress(40);
      setLoadingText('Embedding uploaded images...');

      // Loop through all placed image overlays
      for (let index = 0; index < imageOverlays.length; index++) {
        const imgOverlay = imageOverlays[index];

        // Base64 to Uint8Array bytes
        const base64Data = imgOverlay.dataUrl.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        let embeddedImage;
        if (imgOverlay.mimeType === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(bytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(bytes);
        }

        // Target pages
        const targetPageIndices: number[] = [];
        if (imgOverlay.pageNumber === -1) {
          for (let p = 0; p < pages.length; p++) targetPageIndices.push(p);
        } else {
          const pIdx = imgOverlay.pageNumber - 1;
          if (pIdx >= 0 && pIdx < pages.length) targetPageIndices.push(pIdx);
        }

        // Draw image on target pages
        for (const pageIdx of targetPageIndices) {
          const page = pages[pageIdx];
          const rawSize = page.getSize();
          const rotation = (page.getRotation().angle || 0) % 360;

          // Account for PDF page rotation if present
          const isRotated = rotation === 90 || rotation === 270;
          const width = isRotated ? rawSize.height : rawSize.width;
          const height = isRotated ? rawSize.width : rawSize.height;

          // EXACT MATCH MATH:
          // 1. Calculate actual width in PDF points based on user chosen widthPct %
          const actualW = (imgOverlay.widthPct / 100) * width;

          // 2. Use natural image aspect ratio so image NEVER stretches or distorts
          const imgAspect = embeddedImage.width / embeddedImage.height;
          const actualH = actualW / imgAspect;

          // 3. Convert Top-Left percentage origin to pdf-lib Bottom-Left origin:
          const pdfX = (imgOverlay.xPct / 100) * width;
          const topY = height - ((imgOverlay.yPct / 100) * height);
          const pdfY = topY - actualH;

          page.drawImage(embeddedImage, {
            x: Math.max(0, pdfX),
            y: Math.max(0, pdfY),
            width: actualW,
            height: actualH,
            opacity: imgOverlay.opacity ?? 1.0
          });
        }

        setProgress(40 + Math.round(((index + 1) / imageOverlays.length) * 45));
      }

      // Save and Download
      setProgress(90);
      setLoadingText('Generating PDF file...');
      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdfFile.name.replace(/\.[^/.]+$/, '')}_with_images.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setProgress(100);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Error embedding images into PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedOverlay = imageOverlays.find((i) => i.id === selectedImageId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="pdf-editor"
        title="Add Image into PDF"
        description="Insert, scale, position, and overlay images, stamps, signatures, and logos into any PDF document with instant corner dragging."
        category="pdf"
        categoryName="PDF Tools"
      />

      {!pdfFile ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesSelected={handlePdfSelected}
            label="Upload PDF Document"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">

          {/* MAIN CANVAS WORKSPACE */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Top Controls Toolbar */}
            <div className="flex flex-wrap justify-between items-center bg-white dark:bg-dark-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-2">
              
              {/* Add Image Button */}
              <label className="cursor-pointer bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-brand-600/20 transition-all">
                <Upload size={14} />
                <span>+ Upload Image / Stamp / Signature</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  multiple
                  onChange={handleImagesUpload}
                  className="hidden"
                />
              </label>

              {/* Page Controls */}
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Page {currentPage} of {numPages}
                </span>
                <button
                  disabled={currentPage >= numPages}
                  onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Zoom & Change PDF */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRenderScale((s) => Math.max(0.8, s - 0.2))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-semibold text-slate-500">
                  {Math.round(renderScale * 100)}%
                </span>
                <button
                  onClick={() => setRenderScale((s) => Math.min(2.0, s + 0.2))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>

                <button
                  onClick={() => {
                    setPdfFile(null);
                    setArrayBuffer(null);
                    pdfDocRef.current = null;
                  }}
                  className="text-xs text-rose-500 font-bold hover:underline ml-2"
                >
                  Change PDF
                </button>
              </div>
            </div>

            {/* Interactive Canvas Viewport */}
            <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-auto bg-slate-200 dark:bg-slate-950 p-4 flex justify-center items-center min-h-[500px]">
              
              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-dark-card/80 z-30 flex items-center justify-center p-6">
                  <ProgressBar progress={progress} statusText={loadingText} />
                </div>
              )}

              <div className="relative shadow-2xl rounded bg-white inline-block select-none leading-none">
                <canvas ref={canvasRef} className="block rounded max-w-full" />

                {/* Render Placed Image Overlays with 100% Zero-Padding Box Alignment */}
                {imageOverlays
                  .filter((img) => img.pageNumber === currentPage || img.pageNumber === -1)
                  .map((img) => (
                    <div
                      key={img.id}
                      onMouseDown={(e) => handleImageMoveStart(e, img.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageId(img.id);
                      }}
                      style={{
                        left: `${img.xPct}%`,
                        top: `${img.yPct}%`,
                        width: `${img.widthPct}%`,
                        aspectRatio: `${img.aspectRatio}`,
                        opacity: img.opacity
                      }}
                      className={`absolute z-10 transition-all cursor-grab active:cursor-grabbing group ${
                        selectedImageId === img.id
                          ? 'outline-2 outline-dashed outline-brand-600 ring-4 ring-brand-500/30 shadow-2xl'
                          : 'hover:outline-2 hover:outline-dashed hover:outline-brand-500'
                      }`}
                    >
                      <img
                        src={img.dataUrl}
                        alt="Overlay"
                        className="w-full h-full object-fill block pointer-events-none select-none"
                      />

                      {/* Move Handle Badge */}
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white rounded-full p-0.5 shadow z-20 opacity-80 group-hover:opacity-100 cursor-grab"
                        title="Drag to move image"
                      >
                        <Move size={11} />
                      </div>

                      {/* Delete Button Badge */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold shadow z-20"
                        title="Remove Image"
                      >
                        ×
                      </button>

                      {/* Interactive 4 Corner Drag Handles */}
                      {selectedImageId === img.id && (
                        <>
                          {/* Bottom-Right Handle */}
                          <div
                            onMouseDown={(e) => handleImageResizeStart(e, img.id, 'se')}
                            className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-brand-600 border-2 border-white rounded-full cursor-se-resize shadow-md z-20 hover:scale-125 transition-transform"
                            title="Drag corner to resize image"
                          />
                          {/* Bottom-Left Handle */}
                          <div
                            onMouseDown={(e) => handleImageResizeStart(e, img.id, 'sw')}
                            className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-brand-600 border-2 border-white rounded-full cursor-sw-resize shadow-md z-20 hover:scale-125 transition-transform"
                            title="Drag corner to resize image"
                          />
                          {/* Top-Right Handle */}
                          <div
                            onMouseDown={(e) => handleImageResizeStart(e, img.id, 'ne')}
                            className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-brand-600 border-2 border-white rounded-full cursor-ne-resize shadow-md z-20 hover:scale-125 transition-transform"
                            title="Drag corner to resize image"
                          />
                          {/* Top-Left Handle */}
                          <div
                            onMouseDown={(e) => handleImageResizeStart(e, img.id, 'nw')}
                            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-brand-600 border-2 border-white rounded-full cursor-nw-resize shadow-md z-20 hover:scale-125 transition-transform"
                            title="Drag corner to resize image"
                          />
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
              <Move size={13} className="text-brand-500" />
              <span>Click and drag with mouse to move image anywhere on the PDF page. Drag corner handles to scale!</span>
            </p>
          </div>

          {/* CONTROLS & SIDEBAR */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-6">
              
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <ImageIcon size={16} className="text-brand-500" />
                <span>Image Placement & Adjustments</span>
              </h3>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Upload Image / Stamp / Signature / Logo
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  multiple
                  onChange={handleImagesUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-500/10 file:text-brand-600 hover:file:bg-brand-500/20 cursor-pointer"
                />
              </div>

              {/* Selected Image Fine-Tuning */}
              {selectedOverlay ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-xs font-semibold">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-bold text-brand-600 truncate max-w-[180px]">
                      📷 {selectedOverlay.fileName}
                    </span>
                    <button
                      onClick={() => handleRemoveImage(selectedOverlay.id)}
                      className="text-rose-500 hover:text-rose-700 font-bold text-[11px] flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  </div>

                  {/* Target Page Selection */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Apply Image To</label>
                    <select
                      value={selectedOverlay.pageNumber}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setImageOverlays((prev) =>
                          prev.map((i) => (i.id === selectedOverlay.id ? { ...i, pageNumber: val } : i))
                        );
                      }}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-xs"
                    >
                      <option value={currentPage}>Current Page (Page {currentPage})</option>
                      <option value={-1}>All Pages in PDF ({numPages} Pages)</option>
                      {Array.from({ length: numPages }, (_, idx) => (
                        <option key={idx + 1} value={idx + 1}>Page {idx + 1}</option>
                      ))}
                    </select>
                  </div>

                  {/* Width Slider (Height automatically follows natural aspect ratio) */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      Image Scale / Width: {selectedOverlay.widthPct}% of Page Width
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={95}
                      value={selectedOverlay.widthPct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setImageOverlays((prev) =>
                          prev.map((i) =>
                            i.id === selectedOverlay.id
                              ? {
                                  ...i,
                                  widthPct: val,
                                  heightPct: Math.round(val / i.aspectRatio)
                                }
                              : i
                          )
                        );
                      }}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  {/* Opacity Slider */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      Opacity / Transparency: {Math.round(selectedOverlay.opacity * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={selectedOverlay.opacity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setImageOverlays((prev) =>
                          prev.map((i) => (i.id === selectedOverlay.id ? { ...i, opacity: val } : i))
                        );
                      }}
                      className="w-full accent-brand-500"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-xs text-center py-4">
                  Upload an image to place it on the PDF page. Select any image to adjust its dimensions or opacity.
                </p>
              )}

              {/* List of Uploaded Images */}
              {imageOverlays.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Added Images ({imageOverlays.length})
                  </h4>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {imageOverlays.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setSelectedImageId(img.id)}
                        className={`flex justify-between items-center p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                          selectedImageId === img.id
                            ? 'bg-brand-500/10 border-brand-500 text-brand-600 font-bold'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="truncate flex-1 pr-2">
                          <span>{img.fileName}</span>{" "}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({img.pageNumber === -1 ? 'All Pages' : `Pg ${img.pageNumber}`})
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(img.id);
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button: Export & Download */}
              <div className="pt-2">
                <button
                  onClick={handleExportPdf}
                  disabled={isProcessing || imageOverlays.length === 0}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.02]"
                >
                  <Download size={14} />
                  <span>Download PDF with Image</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default PdfEditor;
