import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { Download, Sliders, LayoutGrid, RotateCw, ZoomIn, ZoomOut, Check, Paintbrush, Pipette } from 'lucide-react';

import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

const rgbToHex = (r: number, g: number, b: number) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const v = max;

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
};

const getColorDistance = (
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number => {
  const hsv1 = rgbToHsv(r1, g1, b1);
  const hsv2 = rgbToHsv(r2, g2, b2);

  // If the target background color has significant saturation (e.g. blue or red backdrop)
  if (hsv2.s > 8) {
    let hDiff = Math.abs(hsv1.h - hsv2.h);
    if (hDiff > 180) hDiff = 360 - hDiff;
    const hDist = (hDiff / 180) * 100;

    const sDist = Math.abs(hsv1.s - hsv2.s);
    const vDist = Math.abs(hsv1.v - hsv2.v);

    // Prioritize Hue (80%) for highly clean separation under shadows/highlights
    return hDist * 0.8 + sDist * 0.15 + vDist * 0.05;
  } else {
    // For white/grey backgrounds, use standard Euclidean RGB distance (normalized to 0-100 scale)
    const rgbDist = Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2)
    );
    return (rgbDist / Math.sqrt(3 * 255 * 255)) * 100;
  }
};

const replaceBackgroundColor = (
  img: HTMLImageElement | HTMLCanvasElement,
  targetBgColor: { r: number; g: number; b: number },
  replacementColor: { r: number; g: number; b: number },
  tolerance: number,
  chokeSize: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const width = canvas.width;
  const height = canvas.height;

  // We optimize transition borders (crisp anti-aliased feathering only in the outer 10% of tolerance range)
  const transitionStart = tolerance * 0.90;
  const transitionRange = tolerance - transitionStart;

  const isBackgroundArray = new Array(width * height).fill(false);
  const visited = new Uint8Array(width * height);

  // Queue for flood fill
  const queueX: number[] = [];
  const queueY: number[] = [];

  // Seed points: all along the top, left, and right borders of the image
  // (where the background is always located in a portrait/passport photo)
  for (let x = 0; x < width; x += 5) {
    queueX.push(x);
    queueY.push(0);
    visited[x] = 1;
  }
  for (let y = 0; y < height; y += 5) {
    // Left edge
    queueX.push(0);
    queueY.push(y);
    visited[y * width] = 1;

    // Right edge
    queueX.push(width - 1);
    queueY.push(y);
    visited[y * width + (width - 1)] = 1;
  }

  let head = 0;
  while (head < queueX.length) {
    const cx = queueX[head];
    const cy = queueY[head];
    head++;

    const idx = cy * width + cx;
    const pIdx = idx * 4;

    const r = data[pIdx];
    const g = data[pIdx + 1];
    const b = data[pIdx + 2];

    const distance = getColorDistance(r, g, b, targetBgColor.r, targetBgColor.g, targetBgColor.b);

    if (distance < tolerance) {
      isBackgroundArray[idx] = true;

      // Replace color
      if (distance < transitionStart) {
        data[pIdx] = replacementColor.r;
        data[pIdx + 1] = replacementColor.g;
        data[pIdx + 2] = replacementColor.b;
      } else {
        const factor = (distance - transitionStart) / transitionRange;
        data[pIdx] = Math.round(replacementColor.r * (1 - factor) + r * factor);
        data[pIdx + 1] = Math.round(replacementColor.g * (1 - factor) + g * factor);
        data[pIdx + 2] = Math.round(replacementColor.b * (1 - factor) + b * factor);
      }

      // Check 4-way neighbors
      const dx = [1, -1, 0, 0];
      const dy = [0, 0, 1, -1];

      for (let i = 0; i < 4; i++) {
        const nx = cx + dx[i];
        const ny = cy + dy[i];

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (visited[nIdx] === 0) {
            visited[nIdx] = 1;
            queueX.push(nx);
            queueY.push(ny);
          }
        }
      }
    }
  }

  // Apply morphological Matte Choke to eat border outlines
  if (chokeSize > 0) {
    const tempMask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (isBackgroundArray[idx]) {
          tempMask[idx] = 1;
          continue;
        }

        let shouldBeBg = false;
        for (let dy = -chokeSize; dy <= chokeSize; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;

          for (let dx = -chokeSize; dx <= chokeSize; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;

            const nIdx = ny * width + nx;
            if (isBackgroundArray[nIdx]) {
              shouldBeBg = true;
              break;
            }
          }
          if (shouldBeBg) break;
        }

        if (shouldBeBg) {
          tempMask[idx] = 2; // marked to become background
        }
      }
    }

    for (let i = 0; i < tempMask.length; i++) {
      if (tempMask[i] === 2) {
        const pIdx = i * 4;
        data[pIdx] = replacementColor.r;
        data[pIdx + 1] = replacementColor.g;
        data[pIdx + 2] = replacementColor.b;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
};

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

  // Background Changer States
  const [isBgChangeEnabled, setIsBgChangeEnabled] = useState<boolean>(false);
  const [sourceBgColor, setSourceBgColor] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 255, b: 255 });
  const [newBgColor, setNewBgColor] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 255, b: 255 });
  const [bgTolerance, setBgTolerance] = useState<number>(25);
  const [hasEyeDropper, setHasEyeDropper] = useState<boolean>(false);
  const [matteChokeSize, setMatteChokeSize] = useState<number>(1);
  const [useAiRemoval] = useState<boolean>(true);
  const [aiTransparentUrl, setAiTransparentUrl] = useState<string | null>(null);
  const [aiTransparentObj, setAiTransparentObj] = useState<HTMLImageElement | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  useEffect(() => {
    setHasEyeDropper(typeof window !== 'undefined' && 'EyeDropper' in window);
  }, []);

  const handlePickColor = async () => {
    // @ts-ignore
    if (!window.EyeDropper) return;
    // @ts-ignore
    const eyeDropper = new window.EyeDropper();
    try {
      const result = await eyeDropper.open();
      const rgb = hexToRgb(result.sRGBHex);
      if (rgb) {
        setSourceBgColor(rgb);
        setPdfBlobUrl(null);
      }
    } catch (e) {
      console.warn('Eyedropper was cancelled or failed:', e);
    }
  };

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
    if (aiTransparentUrl) URL.revokeObjectURL(aiTransparentUrl);
    setAiTransparentUrl(null);
    setAiTransparentObj(null);

    // Load Image Object
    const img = new Image();
    img.src = url;
    img.onload = () => {
      // Downscale if image is too large (max 1200px) for smooth real-time background color changes
      const maxDim = 1200;
      if (img.width > maxDim || img.height > maxDim) {
        const scale = Math.min(maxDim / img.width, maxDim / img.height);
        const scaleCanvas = document.createElement('canvas');
        scaleCanvas.width = img.width * scale;
        scaleCanvas.height = img.height * scale;
        const sCtx = scaleCanvas.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(img, 0, 0, scaleCanvas.width, scaleCanvas.height);
          const scaledImg = new Image();
          scaledImg.src = scaleCanvas.toDataURL('image/jpeg', 0.9);
          scaledImg.onload = () => {
            setImageObj(scaledImg);
            const pCtx = scaleCanvas.getContext('2d');
            if (pCtx) {
              const pixel = pCtx.getImageData(5, 5, 1, 1).data;
              setSourceBgColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
            }
          };
        }
      } else {
        setImageObj(img);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 10;
        tempCanvas.height = 10;
        const tCtx = tempCanvas.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(img, 0, 0, 10, 10);
          const pixel = tCtx.getImageData(1, 1, 1, 1).data;
          setSourceBgColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
        }
      }
    };
  };

  useEffect(() => {
    if (!imageFile || !useAiRemoval || aiTransparentUrl || isAiLoading) return;

    let active = true;
    const runAi = async () => {
      setIsAiLoading(true);
      try {
        // @ts-ignore
        const { removeBackground } = await import('@imgly/background-removal');
        // @ts-ignore
        const blob = await removeBackground(imageFile, {
          publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.5.6/dist/',
          progress: (milestone: string, progress: number) => {
            console.log(`AI Milestone: ${milestone} (${Math.round(progress * 100)}%)`);
          }
        });
        if (!active) return;
        const transparentUrl = URL.createObjectURL(blob);
        setAiTransparentUrl(transparentUrl);
        setPdfBlobUrl(null);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = transparentUrl;
        img.onload = () => {
          if (active) {
            setAiTransparentObj(img);
          }
        };
      } catch (e) {
        console.error('AI background removal failed:', e);
      } finally {
        if (active) {
          setIsAiLoading(false);
        }
      }
    };

    runAi();

    return () => {
      active = false;
    };
  }, [imageFile, useAiRemoval, aiTransparentUrl]);

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

    let renderSource: HTMLImageElement | HTMLCanvasElement = imageObj;
    if (isBgChangeEnabled) {
      if (useAiRemoval && aiTransparentObj) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = aiTransparentObj.width;
        tempCanvas.height = aiTransparentObj.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.fillStyle = `rgb(${newBgColor.r}, ${newBgColor.g}, ${newBgColor.b})`;
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(aiTransparentObj, 0, 0);
          renderSource = tempCanvas;
        } else {
          renderSource = aiTransparentObj;
        }
      } else {
        renderSource = replaceBackgroundColor(imageObj, sourceBgColor, newBgColor, bgTolerance, matteChokeSize);
      }
    }

    // Draw image centered on current transform origin
    ctx.drawImage(renderSource, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    
    ctx.restore();
  }, [imageObj, zoom, offsetX, offsetY, brightness, contrast, isGrayscale, rotation, isBgChangeEnabled, sourceBgColor, newBgColor, bgTolerance, matteChokeSize, useAiRemoval, aiTransparentObj]);

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
      let renderSource: HTMLImageElement | HTMLCanvasElement = imageObj;
      if (isBgChangeEnabled) {
        if (useAiRemoval && aiTransparentObj) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = aiTransparentObj.width;
          tempCanvas.height = aiTransparentObj.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.fillStyle = `rgb(${newBgColor.r}, ${newBgColor.g}, ${newBgColor.b})`;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(aiTransparentObj, 0, 0);
            renderSource = tempCanvas;
          } else {
            renderSource = aiTransparentObj;
          }
        } else {
          renderSource = replaceBackgroundColor(imageObj, sourceBgColor, newBgColor, bgTolerance, matteChokeSize);
        }
      }

      rCtx.drawImage(renderSource, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
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
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden select-none">
              {isAiLoading && (
                <div className="absolute inset-0 bg-slate-950/70 z-20 flex flex-col items-center justify-center text-white p-4 text-center">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-bold">AI Background Remover is processing...</p>
                  <p className="text-[10px] text-slate-400 mt-1">Isolating hair and outline with studio precision. Please wait.</p>
                </div>
              )}

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

              {/* Background Changer */}
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4 flex items-center gap-2">
                <Paintbrush size={16} className="text-brand-500" />
                <span>Background Changer</span>
              </h3>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-850">
                  <label className="cursor-pointer" htmlFor="bg-change-toggle">
                    Replace Background Color
                  </label>
                  <input
                    id="bg-change-toggle"
                    type="checkbox"
                    checked={isBgChangeEnabled}
                    onChange={(e) => { setIsBgChangeEnabled(e.target.checked); setPdfBlobUrl(null); }}
                    className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
                  />
                </div>

                {isBgChangeEnabled && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 block">Original Background Color to Remove</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={rgbToHex(sourceBgColor.r, sourceBgColor.g, sourceBgColor.b)}
                          onChange={(e) => {
                            const rgb = hexToRgb(e.target.value);
                            if (rgb) setSourceBgColor(rgb);
                            setPdfBlobUrl(null);
                          }}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-200 dark:border-slate-800"
                        />
                        {hasEyeDropper && (
                          <button
                            type="button"
                            onClick={handlePickColor}
                            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400"
                            title="Pick background color from image"
                          >
                            <Pipette size={14} />
                          </button>
                        )}
                        <span className="text-[10px] text-slate-450">Pick original background color</span>
                      </div>
                    </div>
                    {/* Replacement color presets and custom picker */}
                    <div className="space-y-1.5">
                      <label className="text-slate-600 dark:text-slate-400 block">New Background Color</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { name: 'White', hex: '#ffffff', rgb: { r: 255, g: 255, b: 255 } },
                          { name: 'Blue', hex: '#3b82f6', rgb: { r: 59, g: 130, b: 246 } },
                          { name: 'Navy', hex: '#1e3a8a', rgb: { r: 30, g: 58, b: 138 } },
                          { name: 'Red', hex: '#ef4444', rgb: { r: 239, g: 68, b: 68 } },
                          { name: 'Light Grey', hex: '#e2e8f0', rgb: { r: 226, g: 232, b: 240 } }
                        ].map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => { setNewBgColor(preset.rgb); setPdfBlobUrl(null); }}
                            className={`px-2 py-1 rounded border text-[10px] flex items-center gap-1 ${
                              rgbToHex(newBgColor.r, newBgColor.g, newBgColor.b) === preset.hex
                                ? 'border-brand-500 bg-brand-500/10 text-brand-600 font-bold'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-normal'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full border border-slate-350" style={{ backgroundColor: preset.hex }} />
                            <span>{preset.name}</span>
                          </button>
                        ))}
                        {/* Custom picker */}
                        <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
                          <input
                            type="color"
                            value={rgbToHex(newBgColor.r, newBgColor.g, newBgColor.b)}
                            onChange={(e) => {
                              const rgb = hexToRgb(e.target.value);
                              if (rgb) setNewBgColor(rgb);
                              setPdfBlobUrl(null);
                            }}
                            className="w-6 h-6 rounded cursor-pointer border border-slate-200"
                          />
                          <span className="text-[9px] text-slate-400">Custom</span>
                        </div>
                      </div>
                    </div>

                    {/* Color tolerance slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <label>Color Matching Tolerance</label>
                        <span className="font-bold text-brand-650">{bgTolerance}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={bgTolerance}
                        onChange={(e) => { setBgTolerance(parseInt(e.target.value)); setPdfBlobUrl(null); }}
                        className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                      />
                      <span className="text-[9px] text-slate-400 block leading-tight font-normal">
                        Increase if background isn't fully replaced. Decrease if clothes change.
                      </span>
                    </div>

                    {/* Outline Cleaner (Matte Choke) */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex justify-between">
                        <label>Outline Cleaner (Choke)</label>
                        <span className="font-bold text-brand-650">
                          {matteChokeSize === 0 ? 'None' : `${matteChokeSize}px`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        value={matteChokeSize}
                        onChange={(e) => { setMatteChokeSize(parseInt(e.target.value)); setPdfBlobUrl(null); }}
                        className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                      />
                      <span className="text-[9px] text-slate-400 block leading-tight font-normal">
                        Chokes the borders to eat any remaining background color halos.
                      </span>
                    </div>
                  </div>
                )}
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
