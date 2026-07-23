import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCw, FileText, Download, Layers, HelpCircle } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

interface QueueFile {
  id: string;
  file: File;
  type: 'pdf' | 'image';
  name: string;
  sizeKb: number;
  // For PDF files:
  pageCount?: number;
  // For Image files:
  previewUrl?: string;
  rotation?: number; // 0, 90, 180, 270
}

export const MergeJpgPdf: React.FC = () => {
  const { t } = useLanguage();
  const [queueFiles, setQueueFiles] = useState<QueueFile[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<'none' | 'small' | 'large'>('none');
  const [imageFit, setImageFit] = useState<'contain' | 'stretch'>('contain');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true);
    setProgress(10);

    const newQueueItems: QueueFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isPdf = fileExt === 'pdf';

      if (isPdf) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const pageCount = pdfDoc.getPageCount();

          newQueueItems.push({
            id: Math.random().toString(36).substr(2, 9),
            file,
            type: 'pdf',
            name: file.name,
            sizeKb: Math.round(file.size / 1024),
            pageCount
          });
        } catch (err) {
          console.error(err);
          alert(`Failed to load PDF "${file.name}". Ensure the file is not corrupted or password-protected.`);
        }
      } else {
        // Image processing
        newQueueItems.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          type: 'image',
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
          previewUrl: URL.createObjectURL(file),
          rotation: 0
        });
      }
      setProgress(Math.round(10 + (90 * (i + 1)) / files.length));
    }

    setQueueFiles((prev) => [...prev, ...newQueueItems]);
    setPdfBlobUrl(null);
    setIsProcessing(false);
    setProgress(0);
  };

  const removeFile = (id: string) => {
    setQueueFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
    setPdfBlobUrl(null);
  };

  const clearAll = () => {
    queueFiles.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setQueueFiles([]);
    setPdfBlobUrl(null);
  };

  const rotateImage = (id: string) => {
    setQueueFiles((prev) =>
      prev.map((item) =>
        item.id === id && item.type === 'image'
          ? { ...item, rotation: ((item.rotation || 0) + 90) % 360 }
          : item
      )
    );
    setPdfBlobUrl(null);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === queueFiles.length - 1) return;

    const newFiles = [...queueFiles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setQueueFiles(newFiles);
    setPdfBlobUrl(null);
  };

  const processImageRotation = (item: QueueFile): Promise<Uint8Array> => {
    const rotation = item.rotation || 0;
    return new Promise((resolve, reject) => {
      if (rotation === 0) {
        item.file.arrayBuffer()
          .then((buf) => resolve(new Uint8Array(buf)))
          .catch(reject);
        return;
      }

      const img = new Image();
      img.src = item.previewUrl!;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const format = item.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas blob generation failed'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
          reader.readAsArrayBuffer(blob);
        }, format, 1.0);
      };
      img.onerror = () => reject(new Error('Image failed to load'));
    });
  };

  const generatePdf = async () => {
    if (queueFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(5);

    try {
      const mergedPdf = await PDFDocument.create();

      // Page dimensions for image pages
      let widthPt = pageSize === 'A4' ? 595.27 : 612;
      let heightPt = pageSize === 'A4' ? 841.89 : 792;

      if (orientation === 'landscape') {
        const temp = widthPt;
        widthPt = heightPt;
        heightPt = temp;
      }

      let marginPt = 0;
      if (margin === 'small') marginPt = 20;
      if (margin === 'large') marginPt = 40;

      const drawableWidth = widthPt - marginPt * 2;
      const drawableHeight = heightPt - marginPt * 2;

      for (let i = 0; i < queueFiles.length; i++) {
        const item = queueFiles[i];

        if (item.type === 'pdf') {
          // Merge PDF pages
          const arrayBuffer = await item.file.arrayBuffer();
          const srcPdf = await PDFDocument.load(arrayBuffer);
          
          // Flatten forms to prevent duplicate field name conflicts or empty appearance streams
          try {
            const form = srcPdf.getForm();
            form.flatten();
          } catch (e) {
            // Ignore if form doesn't exist or cannot be flattened
          }

          const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } else {
          // Convert Image to page
          const imageBytes = await processImageRotation(item);
          
          let pdfImg;
          if (item.file.type === 'image/png') {
            pdfImg = await mergedPdf.embedPng(imageBytes);
          } else {
            pdfImg = await mergedPdf.embedJpg(imageBytes);
          }

          const page = mergedPdf.addPage([widthPt, heightPt]);

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
        }

        setProgress(Math.round(5 + (90 * (i + 1)) / queueFiles.length));
      }

      const pdfBytes = await mergedPdf.save({ updateFieldAppearances: true });
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error generating consolidated PDF. Please verify your uploaded files are valid PDF or image documents.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="merge-jpg-pdf"
        title={t('tool.mergeJpgPdf.title')}
        description={t('tool.mergeJpgPdf.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {queueFiles.length === 0 ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".pdf,.jpg,.jpeg,.png"
            multiple={true}
            onFilesSelected={handleFilesSelected}
            label="Upload PDF Files or Images (JPG, JPEG, PNG)"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
          {/* Main queue workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Uploaded Items ({queueFiles.length})
              </h3>
              <button
                onClick={clearAll}
                className="text-[10px] text-red-500 hover:underline font-bold"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-3">
              {queueFiles.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-200 shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {item.type === 'pdf' ? (
                      <div className="p-3 rounded-lg bg-red-500/10 text-red-500 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shrink-0 flex items-center justify-center relative">
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          style={{ transform: `rotate(${item.rotation || 0}deg)` }}
                          className="max-h-full max-w-full object-contain transition-transform duration-200"
                        />
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/5 hover:bg-transparent transition-colors" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        {item.type === 'pdf' ? (
                          <span className="text-red-500 bg-red-500/5 dark:bg-red-500/10 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-2">
                            PDF Document
                          </span>
                        ) : (
                          <span className="text-brand-500 bg-brand-500/5 dark:bg-brand-500/10 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-2">
                            Image ({item.file.type.replace('image/', '').toUpperCase()})
                          </span>
                        )}
                        {item.type === 'pdf' ? `${item.pageCount} pages` : `${item.rotation || 0}° rotation`} | {item.sizeKb} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    {item.type === 'image' && (
                      <button
                        onClick={() => rotateImage(item.id)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
                        title="Rotate 90°"
                      >
                        <RotateCw size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => moveFile(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveFile(idx, 'down')}
                      disabled={idx === queueFiles.length - 1}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add files layout card */}
              <label className="border border-dashed border-slate-250 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 p-5 transition-all text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => e.target.files && handleFilesSelected(Array.from(e.target.files))}
                  className="hidden"
                />
                <Plus size={20} className="text-brand-500" />
                <span className="text-[10px] font-bold text-slate-650 dark:text-slate-350">Add PDF Files or Images</span>
              </label>
            </div>
          </div>

          {/* Action and rendering settings panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Layers size={16} className="text-brand-500" />
                <span>Merge Settings</span>
              </h3>

              {/* Note on how rendering works */}
              <div className="p-3 rounded-lg bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 text-[10px] leading-relaxed text-blue-600 dark:text-blue-400 mb-5">
                <p className="font-bold flex items-center gap-1 mb-0.5">
                  <HelpCircle size={12} />
                  <span>How formatting is applied</span>
                </p>
                PDF document layouts and page dimensions are preserved exactly as they are. Image files will be placed on custom PDF pages using the layout options below.
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                {/* Page Size */}
                <div className="space-y-1.5">
                  <label>Image Page Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setPageSize('A4'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold transition-all text-[11px] cursor-pointer ${
                        pageSize === 'A4'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      A4 (Standard Print)
                    </button>
                    <button
                      onClick={() => { setPageSize('Letter'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold transition-all text-[11px] cursor-pointer ${
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
                  <label>Image Page Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setOrientation('portrait'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold transition-all text-[11px] cursor-pointer ${
                        orientation === 'portrait'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      onClick={() => { setOrientation('landscape'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold transition-all text-[11px] cursor-pointer ${
                        orientation === 'landscape'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                {/* Margins */}
                <div className="space-y-1.5">
                  <label>Image Page Margins</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['none', 'small', 'large'].map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMargin(m as any); setPdfBlobUrl(null); }}
                        className={`py-1.5 rounded-lg border text-center font-bold capitalize transition-all text-[11px] cursor-pointer ${
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
                      className={`py-1.5 rounded-lg border text-center font-bold transition-all text-[11px] cursor-pointer ${
                        imageFit === 'contain'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                      title="Maintain image proportions"
                    >
                      Fit (Proportional)
                    </button>
                    <button
                      onClick={() => { setImageFit('stretch'); setPdfBlobUrl(null); }}
                      className={`py-1.5 rounded-lg border text-center font-bold transition-all text-[11px] cursor-pointer ${
                        imageFit === 'stretch'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                      title="Stretch to fill the full page"
                    >
                      Fill (Stretch)
                    </button>
                  </div>
                </div>
              </div>

              {/* Conversion Limit / Compile Actions */}
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                {isProcessing && <ProgressBar progress={progress} statusText="Merging & compiling PDF..." />}

                {pdfBlobUrl ? (
                  <div className="space-y-3">
                    <a
                      href={pdfBlobUrl}
                      download={`merged_document_${Date.now()}.pdf`}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                    >
                      <Download size={15} />
                      <span>Download Consolidated PDF</span>
                    </a>

                    <button
                      onClick={() => {
                        const win = window.open(pdfBlobUrl);
                        win?.print();
                      }}
                      className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Print Consolidated PDF</span>
                    </button>

                    <button
                      onClick={() => setPdfBlobUrl(null)}
                      className="w-full text-center text-[10px] font-bold text-slate-450 hover:underline cursor-pointer"
                    >
                      Modify order and re-merge
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={generatePdf}
                    disabled={isProcessing || queueFiles.length === 0}
                    className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <span>Merge Files to PDF</span>
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

export default MergeJpgPdf;
