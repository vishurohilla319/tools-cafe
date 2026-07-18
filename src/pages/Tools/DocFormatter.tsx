import React, { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { Download, Layout, Check, AlertTriangle } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

interface CardState {
  file: File | null;
  url: string | null;
  imageObj: HTMLImageElement | null;
  brightness: number;
  contrast: number;
  isGrayscale: boolean;
}

const initialCardState: CardState = {
  file: null,
  url: null,
  imageObj: null,
  brightness: 100,
  contrast: 100,
  isGrayscale: false
};

export const DocFormatter: React.FC = () => {
  const { t } = useLanguage();
  const [frontCard, setFrontCard] = useState<CardState>(initialCardState);
  const [backCard, setBackCard] = useState<CardState>(initialCardState);

  // Settings
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [cardWidthMm, setCardWidthMm] = useState<number>(85.6); // PVC standard width
  const [cardHeightMm, setCardHeightMm] = useState<number>(54);   // PVC standard height
  const [copies, setCopies] = useState<number>(1); // 1, 2, or 3 copies

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const handleFrontSelected = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setFrontCard((prev) => ({
        ...prev,
        file,
        url,
        imageObj: img
      }));
    };
    setPdfBlobUrl(null);
  };

  const handleBackSelected = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setBackCard((prev) => ({
        ...prev,
        file,
        url,
        imageObj: img
      }));
    };
    setPdfBlobUrl(null);
  };

  const clearCard = (side: 'front' | 'back') => {
    if (side === 'front') {
      if (frontCard.url) URL.revokeObjectURL(frontCard.url);
      setFrontCard(initialCardState);
    } else {
      if (backCard.url) URL.revokeObjectURL(backCard.url);
      setBackCard(initialCardState);
    }
    setPdfBlobUrl(null);
  };

  // Helper to draw filtered card onto canvas and export bytes
  const getProcessedImageBytes = (card: CardState): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      if (!card.imageObj) {
        reject(new Error('Image object is empty'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = card.imageObj.width;
      canvas.height = card.imageObj.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      ctx.save();
      
      // Apply filters
      let filterString = `brightness(${card.brightness}%) contrast(${card.contrast}%)`;
      if (card.isGrayscale) filterString += ' grayscale(100%)';
      ctx.filter = filterString;

      ctx.drawImage(card.imageObj, 0, 0);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image blob'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.readAsArrayBuffer(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const generatePrintPdf = async () => {
    if (!frontCard.imageObj) {
      alert('Please upload at least the Front side image of the document.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.27, 841.89]); // A4 in points

      setProgress(30);

      // Embed front image
      const frontBytes = await getProcessedImageBytes(frontCard);
      const embeddedFront = await pdfDoc.embedJpg(frontBytes);

      // Embed back image if uploaded
      let embeddedBack = null;
      if (backCard.imageObj) {
        const backBytes = await getProcessedImageBytes(backCard);
        embeddedBack = await pdfDoc.embedJpg(backBytes);
      }

      setProgress(60);

      // Convert mm to points (1 mm = 2.8346 pt)
      const cardW = cardWidthMm * 2.8346;
      const cardH = cardHeightMm * 2.8346;

      // Draw coordinates
      const rowGap = 25;

      if (layout === 'horizontal') {
        // Front and Back side-by-side in each row
        // Total combined width = 2 * cardW + gap
        const gap = 15;
        const totalW = cardW * 2 + gap;
        const startX = (595.27 - totalW) / 2;

        // Rows starting from top
        const totalHeight = copies * cardH + (copies - 1) * rowGap;
        const startY = 841.89 - 100 - totalHeight;

        for (let i = 0; i < copies; i++) {
          const y = startY + (copies - 1 - i) * (cardH + rowGap);
          
          // Front Card
          page.drawImage(embeddedFront, {
            x: startX,
            y,
            width: cardW,
            height: cardH
          });
          page.drawRectangle({
            x: startX - 0.5,
            y: y - 0.5,
            width: cardW + 1,
            height: cardH + 1,
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 0.5
          });

          // Back Card
          if (embeddedBack) {
            const backX = startX + cardW + gap;
            page.drawImage(embeddedBack, {
              x: backX,
              y,
              width: cardW,
              height: cardH
            });
            page.drawRectangle({
              x: backX - 0.5,
              y: y - 0.5,
              width: cardW + 1,
              height: cardH + 1,
              borderColor: rgb(0.85, 0.85, 0.85),
              borderWidth: 0.5
            });
          }
        }
      } else {
        // Vertical stacked: Front on top, Back on bottom in each copy block
        const startX = (595.27 - cardW) / 2;
        const cardGap = 8; // gap between front/back

        const blockH = cardH * 2 + cardGap;
        const totalHeight = copies * blockH + (copies - 1) * rowGap;
        const startY = 841.89 - 100 - totalHeight;

        for (let i = 0; i < copies; i++) {
          const blockY = startY + (copies - 1 - i) * (blockH + rowGap);
          
          const frontY = blockY + cardH + cardGap;
          const backY = blockY;

          // Front Card
          page.drawImage(embeddedFront, {
            x: startX,
            y: frontY,
            width: cardW,
            height: cardH
          });
          page.drawRectangle({
            x: startX - 0.5,
            y: frontY - 0.5,
            width: cardW + 1,
            height: cardH + 1,
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 0.5
          });

          // Back Card
          if (embeddedBack) {
            page.drawImage(embeddedBack, {
              x: startX,
              y: backY,
              width: cardW,
              height: cardH
            });
            page.drawRectangle({
              x: startX - 0.5,
              y: backY - 0.5,
              width: cardW + 1,
              height: cardH + 1,
              borderColor: rgb(0.85, 0.85, 0.85),
              borderWidth: 0.5
            });
          }
        }
      }

      setProgress(85);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error formatting document layout PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="doc-formatter"
        title={t('tool.docFormatter.title')}
        description={t('tool.docFormatter.desc')}
        category="document"
        categoryName="Document Tools"
      />

      {/* Government Warning Banner */}
      <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-xs font-semibold">
          <span className="font-bold">Disclaimer Notice:</span> This formatting utility is designed solely for formatting documents you are legally permitted to copy or print. It does not verify, authorize, or generate official government identification cards.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload workspace */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Front Card Panel */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Front Side Document Scan
                </h3>
                {frontCard.file && (
                  <button onClick={() => clearCard('front')} className="text-[10px] text-red-500 hover:underline">
                    Remove
                  </button>
                )}
              </div>

              {!frontCard.url ? (
                <FileUpload
                  accept="image/*"
                  multiple={false}
                  onFilesSelected={handleFrontSelected}
                  label="Upload Front Image"
                />
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-4 space-y-4 shadow-sm">
                  <div className="aspect-[1.58] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 flex items-center justify-center relative">
                    <img
                      src={frontCard.url}
                      alt="Front Scan"
                      style={{
                        filter: `brightness(${frontCard.brightness}%) contrast(${frontCard.contrast}%) ${
                          frontCard.isGrayscale ? 'grayscale(100%)' : ''
                        }`
                      }}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Front Adjustments */}
                  <div className="space-y-3 pt-2 text-[11px] font-semibold text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Brightness ({frontCard.brightness}%)</span>
                      <input
                        type="range"
                        min="50"
                        max="180"
                        value={frontCard.brightness}
                        onChange={(e) => {
                          setFrontCard((prev) => ({ ...prev, brightness: parseInt(e.target.value) }));
                          setPdfBlobUrl(null);
                        }}
                        className="w-32 h-1 accent-brand-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Contrast ({frontCard.contrast}%)</span>
                      <input
                        type="range"
                        min="50"
                        max="180"
                        value={frontCard.contrast}
                        onChange={(e) => {
                          setFrontCard((prev) => ({ ...prev, contrast: parseInt(e.target.value) }));
                          setPdfBlobUrl(null);
                        }}
                        className="w-32 h-1 accent-brand-500"
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-2">
                      <span>Black & White</span>
                      <input
                        type="checkbox"
                        checked={frontCard.isGrayscale}
                        onChange={(e) => {
                          setFrontCard((prev) => ({ ...prev, isGrayscale: e.target.checked }));
                          setPdfBlobUrl(null);
                        }}
                        className="w-3.5 h-3.5 accent-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Back Card Panel */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Back Side Document Scan (Optional)
                </h3>
                {backCard.file && (
                  <button onClick={() => clearCard('back')} className="text-[10px] text-red-500 hover:underline">
                    Remove
                  </button>
                )}
              </div>

              {!backCard.url ? (
                <FileUpload
                  accept="image/*"
                  multiple={false}
                  onFilesSelected={handleBackSelected}
                  label="Upload Back Image"
                />
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-4 space-y-4 shadow-sm">
                  <div className="aspect-[1.58] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 flex items-center justify-center relative">
                    <img
                      src={backCard.url}
                      alt="Back Scan"
                      style={{
                        filter: `brightness(${backCard.brightness}%) contrast(${backCard.contrast}%) ${
                          backCard.isGrayscale ? 'grayscale(100%)' : ''
                        }`
                      }}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Back Adjustments */}
                  <div className="space-y-3 pt-2 text-[11px] font-semibold text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Brightness ({backCard.brightness}%)</span>
                      <input
                        type="range"
                        min="50"
                        max="180"
                        value={backCard.brightness}
                        onChange={(e) => {
                          setBackCard((prev) => ({ ...prev, brightness: parseInt(e.target.value) }));
                          setPdfBlobUrl(null);
                        }}
                        className="w-32 h-1 accent-brand-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Contrast ({backCard.contrast}%)</span>
                      <input
                        type="range"
                        min="50"
                        max="180"
                        value={backCard.contrast}
                        onChange={(e) => {
                          setBackCard((prev) => ({ ...prev, contrast: parseInt(e.target.value) }));
                          setPdfBlobUrl(null);
                        }}
                        className="w-32 h-1 accent-brand-500"
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-2">
                      <span>Black & White</span>
                      <input
                        type="checkbox"
                        checked={backCard.isGrayscale}
                        onChange={(e) => {
                          setBackCard((prev) => ({ ...prev, isGrayscale: e.target.checked }));
                          setPdfBlobUrl(null);
                        }}
                        className="w-3.5 h-3.5 accent-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Configurations Sidebar */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              <Layout size={16} className="text-brand-500" />
              <span>Layout Settings</span>
            </h3>

            <div className="space-y-5 text-xs font-semibold text-slate-650 dark:text-slate-350">
              {/* Orientation style */}
              <div className="space-y-1.5">
                <label>Page Orientation Arrangement</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setLayout('horizontal'); setPdfBlobUrl(null); }}
                    className={`py-1.5 rounded-lg border text-center font-bold ${
                      layout === 'horizontal'
                        ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                    title="Front and Back side-by-side on A4"
                  >
                    Side-by-side
                  </button>
                  <button
                    onClick={() => { setLayout('vertical'); setPdfBlobUrl(null); }}
                    className={`py-1.5 rounded-lg border text-center font-bold ${
                      layout === 'vertical'
                        ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                    title="Front stacked on top of Back"
                  >
                    Stacked (Vertical)
                  </button>
                </div>
              </div>

              {/* Dimensions selection */}
              <div className="space-y-1.5">
                <label>Card Output Size Preset</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setCardWidthMm(85.6); setCardHeightMm(54); setPdfBlobUrl(null); }}
                    className={`py-1.5 rounded-lg border text-center font-bold text-[10px] ${
                      cardWidthMm === 85.6
                        ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    Standard ID (85.6x54 mm)
                  </button>
                  <button
                    onClick={() => { setCardWidthMm(125); setCardHeightMm(88); setPdfBlobUrl(null); }}
                    className={`py-1.5 rounded-lg border text-center font-bold text-[10px] ${
                      cardWidthMm === 125
                        ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    Large Scan (125x88 mm)
                  </button>
                </div>
              </div>

              {/* Copies */}
              <div className="space-y-1.5">
                <label>Number of Copies</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => { setCopies(num); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold ${
                        copies === num
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {num} Copy
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Print and Download Actions */}
            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
              {isProcessing && <ProgressBar progress={progress} statusText="Generating document format..." />}

              {pdfBlobUrl ? (
                <div className="space-y-2">
                  <a
                    href={pdfBlobUrl}
                    download={`formatted_id_card_${Date.now()}.pdf`}
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
                    <span>Print PDF</span>
                  </button>

                  <button
                    onClick={() => setPdfBlobUrl(null)}
                    className="w-full text-center text-[10px] font-bold text-slate-400 hover:underline"
                  >
                    Modify Alignment
                  </button>
                </div>
              ) : (
                <button
                  onClick={generatePrintPdf}
                  disabled={!frontCard.imageObj || isProcessing}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                >
                  <Check size={14} />
                  <span>Format for Printing</span>
                </button>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default DocFormatter;
