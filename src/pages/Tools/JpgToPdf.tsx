import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCw, FileText, Download } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import SEOSection from '../../components/shared/SEOSection';
import { useLanguage } from '../../context/LanguageContext';

interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
}

export const JpgToPdf: React.FC = () => {
  const { t } = useLanguage();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<'none' | 'small' | 'large'>('none');
  const [imageFit, setImageFit] = useState<'contain' | 'stretch'>('contain');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    const newImages = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0
    }));
    setImages((prev) => [...prev, ...newImages]);
    setPdfBlobUrl(null);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
    setPdfBlobUrl(null);
  };

  const rotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img
      )
    );
    setPdfBlobUrl(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;
    setImages(newImages);
    setPdfBlobUrl(null);
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Helper to rotate canvas and return blob/buffer
  const processImageRotation = (imgFile: ImageFile): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      if (imgFile.rotation === 0) {
        // Direct read
        readFileAsArrayBuffer(imgFile.file)
          .then((buf) => resolve(new Uint8Array(buf)))
          .catch(reject);
        return;
      }

      const img = new Image();
      img.src = imgFile.previewUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Setup canvas size based on rotation
        if (imgFile.rotation === 90 || imgFile.rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // Draw rotated image
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((imgFile.rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Convert canvas to blob buffer
        const format = imgFile.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas blob generation failed'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
          reader.readAsArrayBuffer(blob);
        }, format, 0.95);
      };
      img.onerror = () => reject(new Error('Image failed to load'));
    });
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProgress(10);

    try {
      const pdfDoc = await PDFDocument.create();

      // Page dimensions in PDF points (1 pt = 1/72 inch)
      // A4: 595.27 x 841.89 pt (8.27 x 11.69 inches)
      // Letter: 612 x 792 pt (8.5 x 11 inches)
      let widthPt = pageSize === 'A4' ? 595.27 : 612;
      let heightPt = pageSize === 'A4' ? 841.89 : 792;

      // Handle landscape orientation
      if (orientation === 'landscape') {
        const temp = widthPt;
        widthPt = heightPt;
        heightPt = temp;
      }

      // Handle margins
      let marginPt = 0;
      if (margin === 'small') marginPt = 20;
      if (margin === 'large') marginPt = 40;

      const drawableWidth = widthPt - marginPt * 2;
      const drawableHeight = heightPt - marginPt * 2;

      for (let i = 0; i < images.length; i++) {
        const imgFile = images[i];
        
        // 1. Process image data (including rotation)
        const imageBytes = await processImageRotation(imgFile);
        
        // 2. Embed image based on mime-type
        let pdfImg;
        if (imgFile.file.type === 'image/png') {
          pdfImg = await pdfDoc.embedPng(imageBytes);
        } else {
          pdfImg = await pdfDoc.embedJpg(imageBytes);
        }

        // 3. Create page
        const page = pdfDoc.addPage([widthPt, heightPt]);

        // 4. Calculate dimensions
        let drawWidth = drawableWidth;
        let drawHeight = drawableHeight;
        let x = marginPt;
        let y = marginPt;

        if (imageFit === 'contain') {
          const imgRatio = pdfImg.width / pdfImg.height;
          const pageRatio = drawableWidth / drawableHeight;

          if (imgRatio > pageRatio) {
            drawHeight = drawableWidth / imgRatio;
            y = marginPt + (drawableHeight - drawHeight) / 2;
          } else {
            drawWidth = drawableHeight * imgRatio;
            x = marginPt + (drawableWidth - drawWidth) / 2;
          }
        }

        page.drawImage(pdfImg, {
          x,
          y,
          width: drawWidth,
          height: drawHeight
        });

        // Update progress
        setProgress(Math.round(10 + (80 * (i + 1)) / images.length));
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF. Please ensure all uploaded files are valid JPG/PNG images.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="jpg-to-pdf"
        title={t('tool.jpgToPdf.title')}
        description={t('tool.jpgToPdf.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {images.length === 0 ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".jpg,.jpeg,.png"
            multiple={true}
            onFilesSelected={handleFilesSelected}
            label="Upload Images (JPG, JPEG, PNG)"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Images Grid Workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Uploaded Images ({images.length})
              </h3>
              <button
                onClick={() => setImages([])}
                className="text-[10px] text-red-500 hover:underline font-bold"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2.5 relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Thumb preview with rotation */}
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center relative">
                    <img
                      src={img.previewUrl}
                      alt={img.file.name}
                      style={{ transform: `rotate(${img.rotation}deg)` }}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                    />
                    
                    <span className="absolute left-1.5 top-1.5 w-5 h-5 rounded-full bg-slate-900/80 flex items-center justify-center text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                  </div>

                  <div className="text-[10px] font-semibold text-slate-450 dark:text-slate-400 mt-2 truncate">
                    {img.file.name}
                  </div>

                  {/* Actions overlay / bottom bar */}
                  <div className="flex justify-end gap-1.5 mt-3 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                    <button
                      onClick={() => moveImage(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => moveImage(idx, 'down')}
                      disabled={idx === images.length - 1}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      onClick={() => rotateImage(img.id)}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                      title="Rotate 90°"
                    >
                      <RotateCw size={12} />
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Quick upload card */}
              <label className="border border-dashed border-slate-250 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 p-4 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => e.target.files && handleFilesSelected(Array.from(e.target.files))}
                  className="hidden"
                />
                <Plus size={20} className="text-brand-500" />
                <span className="text-[10px] font-bold text-slate-500">Add More</span>
              </label>
            </div>
          </div>

          {/* Settings & PDF Output */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <FileText size={16} className="text-brand-500" />
                <span>PDF Page Settings</span>
              </h3>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                {/* Page Size */}
                <div className="space-y-1.5">
                  <label>Page Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setPageSize('A4'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold ${
                        pageSize === 'A4'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      A4 (Print Ready)
                    </button>
                    <button
                      onClick={() => { setPageSize('Letter'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold ${
                        pageSize === 'Letter'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      Letter (Standard)
                    </button>
                  </div>
                </div>

                {/* Orientation */}
                <div className="space-y-1.5">
                  <label>Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setOrientation('portrait'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold ${
                        orientation === 'portrait'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      onClick={() => { setOrientation('landscape'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold ${
                        orientation === 'landscape'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                {/* Margin */}
                <div className="space-y-1.5">
                  <label>Page Margins</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['none', 'small', 'large'].map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMargin(m as any); setPdfBlobUrl(null); }}
                        className={`py-1.5 rounded-lg border text-center font-bold capitalize ${
                          margin === m
                            ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Fit */}
                <div className="space-y-1.5">
                  <label>Image Fit</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setImageFit('contain'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold ${
                        imageFit === 'contain'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                      title="Keep proportions, add borders if needed"
                    >
                      Fit (Proportional)
                    </button>
                    <button
                      onClick={() => { setImageFit('stretch'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold ${
                        imageFit === 'stretch'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                      title="Stretch image to fill the page"
                    >
                      Fill (Stretch)
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress and action buttons */}
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                {isProcessing && <ProgressBar progress={progress} statusText="Generating PDF..." />}

                {pdfBlobUrl ? (
                  <div className="space-y-3">
                    <a
                      href={pdfBlobUrl}
                      download={`compiled_images_${Date.now()}.pdf`}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                    >
                      <Download size={15} />
                      <span>Download PDF</span>
                    </a>
                    
                    <button
                      onClick={() => {
                        const win = window.open(pdfBlobUrl);
                        win?.print();
                      }}
                      className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Print Document</span>
                    </button>

                    <button
                      onClick={() => setPdfBlobUrl(null)}
                      className="w-full text-center text-[10px] font-bold text-slate-400 hover:underline"
                    >
                      Re-generate PDF
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={generatePdf}
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                  >
                    <span>Generate PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO Content & FAQ Section */}
      <SEOSection toolId="jpg-to-pdf" />
    </div>
  );
};

export default JpgToPdf;
