import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { 
  Download, 
  Type, 
  Image as ImageIcon, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Sparkles,
  MousePointer,
  Edit3,
  Check,
  Eraser
} from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type StandardFontKey = 'Helvetica' | 'HelveticaBold' | 'TimesRoman' | 'TimesRomanBold' | 'Courier' | 'CourierBold';

export interface TextOverlay {
  id: string;
  pageNumber: number;
  text: string;
  fontFamily: StandardFontKey;
  fontSize: number;
  color: string; // Hex color string
  xPct: number; // 0 to 100 (% of page width)
  yPct: number; // 0 to 100 (% of page height from top)
  bgWhiteout?: boolean; // Cover original text under this box with white background
}

export interface ImageOverlay {
  id: string;
  pageNumber: number;
  dataUrl: string;
  mimeType: 'image/png' | 'image/jpeg';
  widthPct: number; // % of page width
  heightPct: number; // % of page height
  xPct: number;
  yPct: number;
}

export interface AnalyzedFontInfo {
  detectedText: string;
  fontName: string;
  fontSize: number;
  suggestedFontKey: StandardFontKey;
  xPct: number;
  yPct: number;
}

export const PdfEditor: React.FC = () => {
  const { t } = useLanguage();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [renderScale, setRenderScale] = useState<number>(1.2);

  // PDF JS Doc reference
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([]);
  
  // Selected Overlay for editing
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Font Analysis state
  const [analyzedFont, setAnalyzedFont] = useState<AnalyzedFontInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Add/Edit Text Form State
  const [newText, setNewText] = useState<string>('Sample Text');
  const [fontFamily, setFontFamily] = useState<StandardFontKey>('Helvetica');
  const [fontSize, setFontSize] = useState<number>(14);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [bgWhiteout, setBgWhiteout] = useState<boolean>(true);
  const [clickX, setClickX] = useState<number>(10); // % default
  const [clickY, setClickY] = useState<number>(10); // % default

  // Add Image Form State
  const [uploadedImageData, setUploadedImageData] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [imgWidthPct, setImgWidthPct] = useState<number>(25);
  const [imgHeightPct, setImgHeightPct] = useState<number>(15);

  // Active Tab: 'text' | 'image' | 'analysis'
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'analysis'>('text');

  // Processing & Export
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [loadingText, setLoadingText] = useState<string>('');

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    setTextOverlays([]);
    setImageOverlays([]);
    setAnalyzedFont(null);
    setSelectedTextId(null);
    setSelectedImageId(null);
    setCurrentPage(1);

    const buffer = await file.arrayBuffer();
    setArrayBuffer(buffer);

    try {
      setIsProcessing(true);
      setLoadingText('Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
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

  // Render current page to Canvas
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

  // Load selected text overlay into form for editing
  const loadTextOverlayToForm = (overlay: TextOverlay) => {
    setSelectedTextId(overlay.id);
    setNewText(overlay.text);
    setFontFamily(overlay.fontFamily);
    setFontSize(overlay.fontSize);
    setTextColor(overlay.color);
    setClickX(overlay.xPct);
    setClickY(overlay.yPct);
    setBgWhiteout(overlay.bgWhiteout ?? true);
    setActiveTab('text');
  };

  // Reset text form
  const resetTextForm = () => {
    setSelectedTextId(null);
    setNewText('Sample Text');
    setFontFamily('Helvetica');
    setFontSize(14);
    setTextColor('#000000');
    setBgWhiteout(true);
  };

  // Handle Canvas Click for Analysis and Coordinate setting
  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !pdfDocRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;

    const xPct = Math.round((xPx / rect.width) * 100);
    const yPct = Math.round((yPx / rect.height) * 100);

    setClickX(xPct);
    setClickY(yPct);

    // Perform font analysis at clicked coordinate
    setIsAnalyzing(true);
    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // Calculate clicked coordinates in PDF viewport point space
      const pdfX = (xPx / rect.width) * viewport.width;
      const pdfY = viewport.height - ((yPx / rect.height) * viewport.height);

      let closestItem: any = null;
      let minDistance = Infinity;

      for (const item of textContent.items as any[]) {
        if (!item.str || !item.transform) continue;
        const itemX = item.transform[4];
        const itemY = item.transform[5];

        const dist = Math.hypot(pdfX - itemX, pdfY - itemY);
        if (dist < minDistance && dist < 120) {
          minDistance = dist;
          closestItem = item;
        }
      }

      if (closestItem) {
        const fontName: string = closestItem.fontName || 'Unknown';
        const transformScale = Math.hypot(closestItem.transform[0], closestItem.transform[1]);
        const detectedSize = Math.round(transformScale) || 12;

        let suggestedFont: StandardFontKey = 'Helvetica';
        const fontLower = fontName.toLowerCase();
        if (fontLower.includes('times') || fontLower.includes('serif')) {
          suggestedFont = fontLower.includes('bold') ? 'TimesRomanBold' : 'TimesRoman';
        } else if (fontLower.includes('courier') || fontLower.includes('mono')) {
          suggestedFont = fontLower.includes('bold') ? 'CourierBold' : 'Courier';
        } else if (fontLower.includes('bold')) {
          suggestedFont = 'HelveticaBold';
        }

        setAnalyzedFont({
          detectedText: closestItem.str,
          fontName,
          fontSize: detectedSize,
          suggestedFontKey: suggestedFont,
          xPct,
          yPct
        });

        // Pre-fill form values to match analyzed text font
        setFontFamily(suggestedFont);
        setFontSize(detectedSize);
        if (closestItem.str.trim()) {
          setNewText(closestItem.str);
        }
      } else {
        setAnalyzedFont({
          detectedText: '(No specific text detected near click point)',
          fontName: 'Standard Sans-Serif',
          fontSize: 14,
          suggestedFontKey: 'Helvetica',
          xPct,
          yPct
        });
      }
    } catch (err) {
      console.error('Font analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Replace Detected Original PDF Text
  const handleReplaceDetectedText = () => {
    if (!analyzedFont) return;
    setNewText(analyzedFont.detectedText);
    setFontFamily(analyzedFont.suggestedFontKey);
    setFontSize(analyzedFont.fontSize);
    setClickX(analyzedFont.xPct);
    setClickY(analyzedFont.yPct);
    setBgWhiteout(true);
    setSelectedTextId(null);
    setActiveTab('text');
  };

  // Add or Save Text Overlay
  const handleSaveTextOverlay = () => {
    if (!newText.trim()) return;

    if (selectedTextId) {
      // Update existing overlay
      setTextOverlays((prev) =>
        prev.map((t) =>
          t.id === selectedTextId
            ? {
                ...t,
                text: newText,
                fontFamily,
                fontSize,
                color: textColor,
                xPct: clickX,
                yPct: clickY,
                bgWhiteout
              }
            : t
        )
      );
    } else {
      // Create new overlay
      const overlay: TextOverlay = {
        id: 'text-' + Date.now(),
        pageNumber: currentPage,
        text: newText,
        fontFamily,
        fontSize,
        color: textColor,
        xPct: clickX,
        yPct: clickY,
        bgWhiteout
      };
      setTextOverlays((prev) => [...prev, overlay]);
      setSelectedTextId(overlay.id);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    setUploadedMimeType(mime);

    const reader = new FileReader();
    reader.onload = (evt) => {
      setUploadedImageData(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Add Image Overlay
  const handleAddImageOverlay = () => {
    if (!uploadedImageData) return;

    const overlay: ImageOverlay = {
      id: 'img-' + Date.now(),
      pageNumber: currentPage,
      dataUrl: uploadedImageData,
      mimeType: uploadedMimeType,
      widthPct: imgWidthPct,
      heightPct: imgHeightPct,
      xPct: clickX,
      yPct: clickY
    };

    setImageOverlays((prev) => [...prev, overlay]);
    setSelectedImageId(overlay.id);
  };

  // Remove Overlay
  const handleRemoveText = (id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const handleRemoveImage = (id: string) => {
    setImageOverlays((prev) => prev.filter((img) => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
  };

  // Export Edited PDF
  const handleExportPdf = async () => {
    if (!arrayBuffer || !pdfFile) return;

    setIsProcessing(true);
    setProgress(10);
    setLoadingText('Preparing PDF document...');

    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Embed Standard Fonts
      setProgress(30);
      setLoadingText('Embedding custom fonts...');
      const embeddedFonts = {
        Helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
        HelveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        TimesRoman: await pdfDoc.embedFont(StandardFonts.TimesRoman),
        TimesRomanBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
        Courier: await pdfDoc.embedFont(StandardFonts.Courier),
        CourierBold: await pdfDoc.embedFont(StandardFonts.CourierBold),
      };

      // Draw Text Overlays
      setProgress(50);
      setLoadingText('Drawing text overlays...');
      for (const textOverlay of textOverlays) {
        const pageIdx = textOverlay.pageNumber - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;

        const page = pages[pageIdx];
        const { width, height } = page.getSize();

        // Convert Hex Color to RGB
        const hex = textOverlay.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2) || '00', 16) / 255;
        const g = parseInt(hex.substring(2, 4) || '00', 16) / 255;
        const b = parseInt(hex.substring(4, 6) || '00', 16) / 255;

        const font = embeddedFonts[textOverlay.fontFamily] || embeddedFonts.Helvetica;

        // Calculate PDF point coordinates (pdf-lib origin is bottom-left)
        const pdfX = (textOverlay.xPct / 100) * width;
        const pdfY = height - ((textOverlay.yPct / 100) * height) - textOverlay.fontSize;

        // Draw Whiteout Background rectangle to cover original PDF text if requested
        if (textOverlay.bgWhiteout) {
          const textWidth = font.widthOfTextAtSize(textOverlay.text, textOverlay.fontSize);
          const textHeight = textOverlay.fontSize * 1.25;
          page.drawRectangle({
            x: Math.max(0, pdfX - 2),
            y: Math.max(0, pdfY - 2),
            width: textWidth + 6,
            height: textHeight,
            color: rgb(1, 1, 1) // White rectangle
          });
        }

        page.drawText(textOverlay.text, {
          x: Math.max(0, pdfX),
          y: Math.max(0, pdfY),
          size: textOverlay.fontSize,
          font,
          color: rgb(r, g, b)
        });
      }

      // Draw Image Overlays
      setProgress(75);
      setLoadingText('Embedding image overlays...');
      for (const imgOverlay of imageOverlays) {
        const pageIdx = imgOverlay.pageNumber - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;

        const page = pages[pageIdx];
        const { width, height } = page.getSize();

        // Base64 string to Uint8Array
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

        const imgWidth = (imgOverlay.widthPct / 100) * width;
        const imgHeight = (imgOverlay.heightPct / 100) * height;
        const pdfX = (imgOverlay.xPct / 100) * width;
        const pdfY = height - ((imgOverlay.yPct / 100) * height) - imgHeight;

        page.drawImage(embeddedImage, {
          x: Math.max(0, pdfX),
          y: Math.max(0, pdfY),
          width: imgWidth,
          height: imgHeight
        });
      }

      // Save PDF
      setProgress(90);
      setLoadingText('Generating updated PDF file...');
      const pdfBytes = await pdfDoc.save();

      // Trigger Download
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdfFile.name.replace(/\.[^/.]+$/, '')}_edited.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setProgress(100);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Error processing and exporting edited PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="pdf-editor"
        title={t('tool.pdfEditor.title')}
        description={t('tool.pdfEditor.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {!pdfFile ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload PDF Document to Edit"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Interactive Workspace (Canvas & Overlay Preview) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Toolbar */}
            <div className="flex flex-wrap justify-between items-center bg-white dark:bg-dark-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-2">
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
              </div>

              <button
                onClick={() => {
                  setPdfFile(null);
                  setArrayBuffer(null);
                  pdfDocRef.current = null;
                }}
                className="text-xs text-rose-500 font-bold hover:underline"
              >
                Change PDF
              </button>
            </div>

            {/* Interactive Canvas Viewport */}
            <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-auto bg-slate-200 dark:bg-slate-950 p-4 flex justify-center items-center min-h-[500px]">
              
              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-dark-card/80 z-30 flex items-center justify-center p-6">
                  <ProgressBar progress={progress} statusText={loadingText} />
                </div>
              )}

              <div
                ref={containerRef}
                onClick={handleCanvasClick}
                className="relative cursor-crosshair shadow-2xl rounded bg-white inline-block select-none"
              >
                <canvas ref={canvasRef} className="block rounded max-w-full" />

                {/* Render Text Overlays for Current Page */}
                {textOverlays
                  .filter((t) => t.pageNumber === currentPage)
                  .map((t) => (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTextOverlayToForm(t);
                      }}
                      style={{
                        left: `${t.xPct}%`,
                        top: `${t.yPct}%`,
                        color: t.color,
                        fontSize: `${t.fontSize * renderScale}px`,
                        fontFamily: t.fontFamily.includes('Times')
                          ? 'Times New Roman, serif'
                          : t.fontFamily.includes('Courier')
                          ? 'Courier New, monospace'
                          : 'Arial, sans-serif',
                        fontWeight: t.fontFamily.includes('Bold') ? 'bold' : 'normal'
                      }}
                      className={`absolute z-10 p-1 rounded border border-dashed transition-all cursor-pointer ${
                        t.bgWhiteout ? 'bg-white shadow-sm ring-1 ring-slate-300' : 'bg-white/40 dark:bg-black/40'
                      } ${
                        selectedTextId === t.id
                          ? 'border-brand-600 ring-2 ring-brand-500/40'
                          : 'border-slate-400 hover:border-brand-500'
                      }`}
                    >
                      <span>{t.text}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveText(t.id);
                        }}
                        className="ml-1 text-rose-600 hover:text-rose-800 font-bold text-[10px] inline-flex items-center"
                        title="Delete Overlay"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {/* Render Image Overlays for Current Page */}
                {imageOverlays
                  .filter((img) => img.pageNumber === currentPage)
                  .map((img) => (
                    <div
                      key={img.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageId(img.id);
                        setActiveTab('image');
                      }}
                      style={{
                        left: `${img.xPct}%`,
                        top: `${img.yPct}%`,
                        width: `${img.widthPct}%`,
                        height: `${img.heightPct}%`
                      }}
                      className={`absolute z-10 p-0.5 rounded border border-dashed transition-all cursor-pointer hover:border-brand-500 group ${
                        selectedImageId === img.id
                          ? 'border-brand-600 ring-2 ring-brand-500/40'
                          : 'border-slate-400'
                      }`}
                    >
                      <img
                        src={img.dataUrl}
                        alt="Overlay"
                        className="w-full h-full object-contain block"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold shadow"
                        title="Delete Image Overlay"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
              <MousePointer size={13} className="text-brand-500" />
              <span>Click anywhere on the PDF page above to analyze existing text/fonts and set target text edit placement.</span>
            </p>
          </div>

          {/* Configuration & Controls Sidebar */}
          <div className="space-y-6">
            
            {/* Sidebar Tabs */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-6">
              
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'text'
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Type size={14} />
                  <span>{selectedTextId ? 'Edit Text' : 'Add Text'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('image')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'image'
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <ImageIcon size={14} />
                  <span>Add Image</span>
                </button>

                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'analysis'
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Font Info</span>
                </button>
              </div>

              {/* TAB 1: ADD & EDIT TEXT */}
              {activeTab === 'text' && (
                <div className="space-y-4 text-xs font-semibold">
                  
                  {selectedTextId && (
                    <div className="flex justify-between items-center bg-brand-500/10 p-2.5 rounded-lg text-brand-600 font-bold text-[11px]">
                      <span>Editing Selected Text Overlay</span>
                      <button
                        onClick={resetTextForm}
                        className="text-xs hover:underline text-slate-500"
                      >
                        + Create New Text
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Text Content</label>
                    <textarea
                      rows={2}
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      placeholder="Type text to overlay..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as StandardFontKey)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs outline-none"
                    >
                      <option value="Helvetica">Helvetica / Arial (Sans-Serif)</option>
                      <option value="HelveticaBold">Helvetica Bold</option>
                      <option value="TimesRoman">Times Roman (Serif)</option>
                      <option value="TimesRomanBold">Times Roman Bold</option>
                      <option value="Courier">Courier (Monospace)</option>
                      <option value="CourierBold">Courier Bold</option>
                    </select>
                  </div>

                  {/* Size & Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">Font Size (pt)</label>
                      <input
                        type="number"
                        min={6}
                        max={120}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">Text Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-9 h-9 p-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-mono text-slate-500 uppercase">{textColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cover Original Text / Whiteout Option */}
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bgWhiteout}
                      onChange={(e) => setBgWhiteout(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1.5">
                        <Eraser size={13} className="text-brand-500" />
                        <span>Cover / Whiteout Original PDF Text</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Erases the underlying PDF text before drawing edited text on top.
                      </span>
                    </div>
                  </label>

                  {/* Position Coordinates */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold">Target Position (Page {currentPage})</span>
                      <span className="text-brand-600 font-mono">X: {clickX}%, Y: {clickY}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400">X Position (%)</span>
                        <input
                          type="range"
                          min={0}
                          max={95}
                          value={clickX}
                          onChange={(e) => setClickX(Number(e.target.value))}
                          className="w-full accent-brand-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Y Position (%)</span>
                        <input
                          type="range"
                          min={0}
                          max={95}
                          value={clickY}
                          onChange={(e) => setClickY(Number(e.target.value))}
                          className="w-full accent-brand-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveTextOverlay}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-600/15 transition-all"
                  >
                    {selectedTextId ? <Check size={14} /> : <Plus size={14} />}
                    <span>{selectedTextId ? 'Save Text Changes' : 'Insert Text Overlay'}</span>
                  </button>
                </div>
              )}

              {/* TAB 2: ADD IMAGE */}
              {activeTab === 'image' && (
                <div className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Upload Image (Stamp / Signature / Logo)</label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleImageUpload}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-500/10 file:text-brand-600 hover:file:bg-brand-500/20 cursor-pointer"
                    />
                  </div>

                  {uploadedImageData && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="h-24 flex items-center justify-center bg-slate-200 dark:bg-slate-950 rounded-lg p-2 overflow-hidden">
                        <img src={uploadedImageData} alt="Preview" className="max-h-full max-w-full object-contain" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400">Width (% Page)</span>
                          <input
                            type="range"
                            min={5}
                            max={80}
                            value={imgWidthPct}
                            onChange={(e) => setImgWidthPct(Number(e.target.value))}
                            className="w-full accent-brand-500"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400">Height (% Page)</span>
                          <input
                            type="range"
                            min={5}
                            max={80}
                            value={imgHeightPct}
                            onChange={(e) => setImgHeightPct(Number(e.target.value))}
                            className="w-full accent-brand-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    disabled={!uploadedImageData}
                    onClick={handleAddImageOverlay}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-600/15 transition-all"
                  >
                    <Plus size={14} />
                    <span>Insert Image Overlay</span>
                  </button>
                </div>
              )}

              {/* TAB 3: FONT ANALYSIS & QUICK REPLACE */}
              {activeTab === 'analysis' && (
                <div className="space-y-4 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Analyzed Font & Quick Replace</span>
                  </h4>

                  {isAnalyzing ? (
                    <div className="py-6 text-center text-slate-500">
                      Analyzing PDF text layer at clicked position...
                    </div>
                  ) : analyzedFont ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3 text-slate-700 dark:text-slate-200">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Detected Text Snippet</span>
                        <p className="font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 mt-1">
                          "{analyzedFont.detectedText}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-slate-400 block">PDF Font Name</span>
                          <span className="font-bold truncate block">{analyzedFont.fontName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Font Size</span>
                          <span className="font-bold block">{analyzedFont.fontSize} pt</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-500/20">
                        <span className="text-slate-400 text-[10px] block">Suggested Font Match</span>
                        <span className="font-bold text-brand-600 dark:text-brand-400">{analyzedFont.suggestedFontKey}</span>
                      </div>

                      <button
                        onClick={handleReplaceDetectedText}
                        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all"
                      >
                        <Edit3 size={13} />
                        <span>Edit & Replace This Text Snippet</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-6">
                      Click anywhere on the PDF page to inspect, edit, and replace existing PDF text snippets.
                    </p>
                  )}
                </div>
              )}

              {/* Added Overlays List */}
              {(textOverlays.length > 0 || imageOverlays.length > 0) && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Added Overlays ({textOverlays.length + imageOverlays.length})
                  </h4>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {textOverlays.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => loadTextOverlayToForm(t)}
                        className={`flex justify-between items-center p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                          selectedTextId === t.id
                            ? 'bg-brand-500/10 border-brand-500 text-brand-600 font-bold'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="truncate flex-1 pr-2">
                          <span className="font-bold">Pg {t.pageNumber}:</span>{" "}
                          <span>{t.text}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveText(t.id);
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {imageOverlays.map((img) => (
                      <div
                        key={img.id}
                        className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]"
                      >
                        <div className="truncate flex-1 pr-2">
                          <span className="font-bold text-slate-700 dark:text-slate-200">Pg {img.pageNumber}:</span>{" "}
                          <span className="text-slate-500">Image Overlay</span>
                        </div>
                        <button
                          onClick={() => handleRemoveImage(img.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button: Export PDF */}
              <div className="pt-2">
                <button
                  onClick={handleExportPdf}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.02]"
                >
                  <Download size={14} />
                  <span>Export & Download Edited PDF</span>
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
