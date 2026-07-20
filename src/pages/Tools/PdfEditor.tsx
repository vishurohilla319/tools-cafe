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
  Eraser,
  Move,
  X
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

  // Direct Text Edit Modal / Popover state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [modalOriginalText, setModalOriginalText] = useState<string>('');
  const [modalNewText, setModalNewText] = useState<string>('');
  const [modalFontFamily, setModalFontFamily] = useState<StandardFontKey>('Helvetica');
  const [modalFontSize, setModalFontSize] = useState<number>(14);
  const [modalTextColor, setModalTextColor] = useState<string>('#000000');
  const [modalWhiteout, setModalWhiteout] = useState<boolean>(true);
  const [modalXPct, setModalXPct] = useState<number>(10);
  const [modalYPct, setModalYPct] = useState<number>(10);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);

  // Add/Edit Text Form State (Sidebar)
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
    setIsEditModalOpen(false);
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
    setSelectedImageId(null);
    setNewText(overlay.text);
    setFontFamily(overlay.fontFamily);
    setFontSize(overlay.fontSize);
    setTextColor(overlay.color);
    setClickX(overlay.xPct);
    setClickY(overlay.yPct);
    setBgWhiteout(overlay.bgWhiteout ?? true);
    setActiveTab('text');
  };

  // Open Direct Text Edit Modal for existing text overlay
  const openOverlayModalEdit = (overlay: TextOverlay) => {
    setEditingOverlayId(overlay.id);
    setModalOriginalText(overlay.text);
    setModalNewText(overlay.text);
    setModalFontFamily(overlay.fontFamily);
    setModalFontSize(overlay.fontSize);
    setModalTextColor(overlay.color);
    setModalWhiteout(overlay.bgWhiteout ?? true);
    setModalXPct(overlay.xPct);
    setModalYPct(overlay.yPct);
    setIsEditModalOpen(true);
  };

  // Select image overlay
  const selectImageOverlay = (img: ImageOverlay) => {
    setSelectedImageId(img.id);
    setSelectedTextId(null);
    setImgWidthPct(img.widthPct);
    setImgHeightPct(img.heightPct);
    setClickX(img.xPct);
    setClickY(img.yPct);
    setActiveTab('image');
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

  // Handle Canvas Click: Always opens the Direct Text Edit Modal for ANY PDF (native or scanned!)
  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !pdfDocRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;

    const xPct = Math.round((xPx / rect.width) * 100);
    const yPct = Math.round((yPx / rect.height) * 100);

    setClickX(xPct);
    setClickY(yPct);

    // Update position of selected overlay if any
    if (selectedImageId) {
      setImageOverlays((prev) =>
        prev.map((img) => (img.id === selectedImageId ? { ...img, xPct, yPct } : img))
      );
    } else if (selectedTextId) {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === selectedTextId ? { ...t, xPct, yPct } : t))
      );
    }

    setIsAnalyzing(true);
    let detectedLineText = '';
    let fontName = 'Standard Sans-Serif';
    let detectedSize = 14;
    let suggestedFont: StandardFontKey = 'Helvetica';

    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // Calculate clicked coordinates in PDF viewport point space
      const pdfX = (xPx / rect.width) * viewport.width;
      const pdfY = viewport.height - ((yPx / rect.height) * viewport.height);

      // Find nearby items on the same horizontal text line
      const lineItems = (textContent.items as any[]).filter((item) => {
        if (!item.str || !item.transform) return false;
        const itemX = item.transform[4];
        const itemY = item.transform[5];
        return Math.abs(pdfY - itemY) < 18 && Math.abs(pdfX - itemX) < 180;
      });

      if (lineItems.length > 0) {
        // Sort items left-to-right by X position
        lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
        detectedLineText = lineItems.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();

        const firstItem = lineItems[0];
        fontName = firstItem.fontName || 'Unknown';
        const transformScale = Math.hypot(firstItem.transform[0], firstItem.transform[1]);
        detectedSize = Math.round(transformScale) || 14;

        const fontLower = fontName.toLowerCase();
        if (fontLower.includes('times') || fontLower.includes('serif')) {
          suggestedFont = fontLower.includes('bold') ? 'TimesRomanBold' : 'TimesRoman';
        } else if (fontLower.includes('courier') || fontLower.includes('mono')) {
          suggestedFont = fontLower.includes('bold') ? 'CourierBold' : 'Courier';
        } else if (fontLower.includes('bold')) {
          suggestedFont = 'HelveticaBold';
        }

        setAnalyzedFont({
          detectedText: detectedLineText,
          fontName,
          fontSize: detectedSize,
          suggestedFontKey: suggestedFont,
          xPct,
          yPct
        });
      }
    } catch (err) {
      console.error('Font analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }

    // ALWAYS OPEN DIRECT EDIT POPUP MODAL at clicked position for ALL PDFs!
    setEditingOverlayId(null);
    setModalOriginalText(detectedLineText);
    setModalNewText(detectedLineText || 'Edited Text');
    setModalFontFamily(suggestedFont);
    setModalFontSize(detectedSize);
    setModalTextColor('#000000');
    setModalWhiteout(true);
    setModalXPct(xPct);
    setModalYPct(yPct);
    setIsEditModalOpen(true);
  };

  // Save Direct Text Edit Modal
  const handleApplyModalTextEdit = () => {
    if (!modalNewText.trim()) return;

    if (editingOverlayId) {
      // Update existing overlay
      setTextOverlays((prev) =>
        prev.map((t) =>
          t.id === editingOverlayId
            ? {
                ...t,
                text: modalNewText,
                fontFamily: modalFontFamily,
                fontSize: modalFontSize,
                color: modalTextColor,
                xPct: modalXPct,
                yPct: modalYPct,
                bgWhiteout: modalWhiteout
              }
            : t
        )
      );
    } else {
      // Add new replacement text overlay
      const overlay: TextOverlay = {
        id: 'text-' + Date.now(),
        pageNumber: currentPage,
        text: modalNewText,
        fontFamily: modalFontFamily,
        fontSize: modalFontSize,
        color: modalTextColor,
        xPct: modalXPct,
        yPct: modalYPct,
        bgWhiteout: modalWhiteout
      };
      setTextOverlays((prev) => [...prev, overlay]);
      setSelectedTextId(overlay.id);
    }

    setIsEditModalOpen(false);
  };

  // Handle Drag-to-Move for Image Overlays
  const handleImageMoveStart = (e: React.MouseEvent, imgId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const startX = e.clientX;
    const startY = e.clientY;

    const img = imageOverlays.find((i) => i.id === imgId);
    if (!img) return;

    selectImageOverlay(img);

    const startXPct = img.xPct;
    const startYPct = img.yPct;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dxPx = moveEvent.clientX - startX;
      const dyPx = moveEvent.clientY - startY;

      const dxPct = (dxPx / canvasRect.width) * 100;
      const dyPct = (dyPx / canvasRect.height) * 100;

      const newXPct = Math.round(Math.max(0, Math.min(95, startXPct + dxPct)));
      const newYPct = Math.round(Math.max(0, Math.min(95, startYPct + dyPct)));

      setClickX(newXPct);
      setClickY(newYPct);

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

  // Handle Drag-to-Move for Text Overlays
  const handleTextMoveStart = (e: React.MouseEvent, textId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const startX = e.clientX;
    const startY = e.clientY;

    const textOverlay = textOverlays.find((t) => t.id === textId);
    if (!textOverlay) return;

    loadTextOverlayToForm(textOverlay);

    const startXPct = textOverlay.xPct;
    const startYPct = textOverlay.yPct;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dxPx = moveEvent.clientX - startX;
      const dyPx = moveEvent.clientY - startY;

      const dxPct = (dxPx / canvasRect.width) * 100;
      const dyPct = (dyPx / canvasRect.height) * 100;

      const newXPct = Math.round(Math.max(0, Math.min(95, startXPct + dxPct)));
      const newYPct = Math.round(Math.max(0, Math.min(95, startYPct + dyPct)));

      setClickX(newXPct);
      setClickY(newYPct);

      setTextOverlays((prev) =>
        prev.map((item) =>
          item.id === textId ? { ...item, xPct: newXPct, yPct: newYPct } : item
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

  // Handle Corner Drag Resize for Image Overlays
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
    const startH = img.heightPct;
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
          let newH = startH;
          let newX = startXPct;
          let newY = startYPct;

          if (corner === 'se') {
            newW = Math.max(5, Math.min(90, startW + dxPct));
            newH = Math.max(5, Math.min(90, startH + dyPct));
          } else if (corner === 'sw') {
            newW = Math.max(5, Math.min(90, startW - dxPct));
            newH = Math.max(5, Math.min(90, startH + dyPct));
            newX = Math.max(0, Math.min(95, startXPct + dxPct));
          } else if (corner === 'ne') {
            newW = Math.max(5, Math.min(90, startW + dxPct));
            newH = Math.max(5, Math.min(90, startH - dyPct));
            newY = Math.max(0, Math.min(95, startYPct + dyPct));
          } else if (corner === 'nw') {
            newW = Math.max(5, Math.min(90, startW - dxPct));
            newH = Math.max(5, Math.min(90, startH - dyPct));
            newX = Math.max(0, Math.min(95, startXPct + dxPct));
            newY = Math.max(0, Math.min(95, startYPct + dyPct));
          }

          const roundedW = Math.round(newW);
          const roundedH = Math.round(newH);

          setImgWidthPct(roundedW);
          setImgHeightPct(roundedH);

          return {
            ...item,
            widthPct: roundedW,
            heightPct: roundedH,
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

  // Replace Detected Original PDF Text
  const handleReplaceDetectedText = () => {
    if (!analyzedFont) return;
    setEditingOverlayId(null);
    setModalOriginalText(analyzedFont.detectedText);
    setModalNewText(analyzedFont.detectedText);
    setModalFontFamily(analyzedFont.suggestedFontKey);
    setModalFontSize(analyzedFont.fontSize);
    setModalTextColor('#000000');
    setModalWhiteout(true);
    setModalXPct(analyzedFont.xPct);
    setModalYPct(analyzedFont.yPct);
    setIsEditModalOpen(true);
  };

  // Add or Save Text Overlay from Sidebar
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
          const textHeight = textOverlay.fontSize * 1.35;
          page.drawRectangle({
            x: Math.max(0, pdfX - 4),
            y: Math.max(0, pdfY - 3),
            width: Math.max(20, textWidth + 8),
            height: textHeight,
            color: rgb(1, 1, 1) // White rectangle to erase original text
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">

          {/* DIRECT INLINE PDF TEXT EDIT MODAL POPUP */}
          {isEditModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Edit3 size={16} className="text-brand-500" />
                    <span>Edit & Replace PDF Text</span>
                  </h3>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                {modalOriginalText ? (
                  <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Detected Original PDF Text:</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 font-mono truncate">
                      "{modalOriginalText}"
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-brand-600 font-medium">
                    💡 Clicked location (X: {modalXPct}%, Y: {modalYPct}%). Type your replacement text below:
                  </p>
                )}

                <div className="space-y-3 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">New Replacement Text</label>
                    <textarea
                      rows={2}
                      value={modalNewText}
                      onChange={(e) => setModalNewText(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                      placeholder="Type edited text to place on PDF..."
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">Font Family</label>
                      <select
                        value={modalFontFamily}
                        onChange={(e) => setModalFontFamily(e.target.value as StandardFontKey)}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs outline-none"
                      >
                        <option value="Helvetica">Helvetica / Arial</option>
                        <option value="HelveticaBold">Helvetica Bold</option>
                        <option value="TimesRoman">Times Roman</option>
                        <option value="TimesRomanBold">Times Roman Bold</option>
                        <option value="Courier">Courier Mono</option>
                        <option value="CourierBold">Courier Bold</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">Font Size (pt)</label>
                      <input
                        type="number"
                        min={6}
                        max={120}
                        value={modalFontSize}
                        onChange={(e) => setModalFontSize(Number(e.target.value))}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div className="flex items-center gap-2">
                      <label className="text-slate-700 dark:text-slate-300 text-xs">Color:</label>
                      <input
                        type="color"
                        value={modalTextColor}
                        onChange={(e) => setModalTextColor(e.target.value)}
                        className="w-7 h-7 p-0.5 rounded border border-slate-200 cursor-pointer"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={modalWhiteout}
                        onChange={(e) => setModalWhiteout(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-bold">Whiteout Old Text</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyModalTextEdit}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/20 transition-all"
                  >
                    <Check size={14} />
                    <span>Apply Text Edit</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
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
                      onMouseDown={(e) => handleTextMoveStart(e, t.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        openOverlayModalEdit(t);
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
                      className={`absolute z-10 p-1 rounded border border-dashed transition-all cursor-grab active:cursor-grabbing group ${
                        t.bgWhiteout ? 'bg-white shadow-sm ring-1 ring-slate-300' : 'bg-white/40 dark:bg-black/40'
                      } ${
                        selectedTextId === t.id
                          ? 'border-brand-600 ring-2 ring-brand-500/40 shadow-md'
                          : 'border-slate-400 hover:border-brand-500'
                      }`}
                    >
                      <span>{t.text}</span>
                      
                      {/* Edit Badge */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOverlayModalEdit(t);
                        }}
                        className="ml-1.5 text-brand-600 hover:text-brand-800 font-bold text-[10px] inline-flex items-center"
                        title="Click to edit text"
                      >
                        <Edit3 size={11} />
                      </button>

                      {/* Remove Button */}
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

                {/* Render Image Overlays with Drag-to-Move and Corner Handles */}
                {imageOverlays
                  .filter((img) => img.pageNumber === currentPage)
                  .map((img) => (
                    <div
                      key={img.id}
                      onMouseDown={(e) => handleImageMoveStart(e, img.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectImageOverlay(img);
                      }}
                      style={{
                        left: `${img.xPct}%`,
                        top: `${img.yPct}%`,
                        width: `${img.widthPct}%`,
                        height: `${img.heightPct}%`
                      }}
                      className={`absolute z-10 p-0.5 rounded border border-dashed transition-all cursor-grab active:cursor-grabbing group ${
                        selectedImageId === img.id
                          ? 'border-brand-600 ring-2 ring-brand-500/50 shadow-lg'
                          : 'border-slate-400 hover:border-brand-500'
                      }`}
                    >
                      <img
                        src={img.dataUrl}
                        alt="Overlay"
                        className="w-full h-full object-contain block pointer-events-none select-none"
                      />

                      {/* Move Handle Badge */}
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white rounded-full p-0.5 shadow z-20 opacity-80 group-hover:opacity-100 cursor-grab"
                        title="Drag to move image"
                      >
                        <Move size={10} />
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold shadow z-20"
                        title="Delete Image Overlay"
                      >
                        ×
                      </button>

                      {/* Interactive Corner Resize Handles */}
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
              <MousePointer size={13} className="text-brand-500" />
              <span>Click anywhere on the PDF page to edit text directly. Drag images or text to move anywhere!</span>
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

              {/* TAB 2: ADD & RESIZE IMAGE */}
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
                          <span className="text-[10px] text-slate-400">Width (% Page): {imgWidthPct}%</span>
                          <input
                            type="range"
                            min={5}
                            max={80}
                            value={imgWidthPct}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setImgWidthPct(val);
                              if (selectedImageId) {
                                setImageOverlays((prev) =>
                                  prev.map((img) => (img.id === selectedImageId ? { ...img, widthPct: val } : img))
                                );
                              }
                            }}
                            className="w-full accent-brand-500"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400">Height (% Page): {imgHeightPct}%</span>
                          <input
                            type="range"
                            min={5}
                            max={80}
                            value={imgHeightPct}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setImgHeightPct(val);
                              if (selectedImageId) {
                                setImageOverlays((prev) =>
                                  prev.map((img) => (img.id === selectedImageId ? { ...img, heightPct: val } : img))
                                );
                              }
                            }}
                            className="w-full accent-brand-500"
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-brand-600 font-medium text-center flex items-center justify-center gap-1">
                        <Move size={12} />
                        <span>Drag with mouse to move image anywhere on PDF!</span>
                      </p>
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
                        onClick={() => openOverlayModalEdit(t)}
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
                        onClick={() => selectImageOverlay(img)}
                        className={`flex justify-between items-center p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                          selectedImageId === img.id
                            ? 'bg-brand-500/10 border-brand-500 text-brand-600 font-bold'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="truncate flex-1 pr-2">
                          <span className="font-bold">Pg {img.pageNumber}:</span>{" "}
                          <span>Image Overlay ({img.widthPct}% x {img.heightPct}%)</span>
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
