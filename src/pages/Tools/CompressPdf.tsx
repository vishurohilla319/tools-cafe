import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import { FileDown, Download, RefreshCw, FileText, CheckCircle2, Zap, Target } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import SEOSection from '../../components/shared/SEOSection';
import { useLanguage } from '../../context/LanguageContext';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type CompressionPreset = 'target' | 'recommended' | 'extreme' | 'low' | 'custom';

interface CompressedResult {
  fileName: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  blobUrl: string;
  pageCount: number;
  percentSaved: number;
}

export const CompressPdf: React.FC = () => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<CompressionPreset>('target');

  // Target size control
  const [targetValue, setTargetValue] = useState<number>(200);
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('KB');
  
  // Custom controls
  const [customQuality, setCustomQuality] = useState<number>(65); // percentage 10-95
  const [customScale, setCustomScale] = useState<number>(1.2); // scale 0.5 - 2.5

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<CompressedResult | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    setSelectedFile(files[0]);
    setResult(null);
  };

  const getCompressionParameters = (overrideRatio?: number) => {
    switch (preset) {
      case 'extreme':
        return { scale: 0.8, quality: 0.45 };
      case 'recommended':
        return { scale: 1.2, quality: 0.65 };
      case 'low':
        return { scale: 1.8, quality: 0.85 };
      case 'custom':
        return { scale: customScale, quality: customQuality / 100 };
      case 'target': {
        const ratio = overrideRatio ?? 1;
        // Dynamically estimate scale and quality from ratio
        const estimatedScale = Math.max(0.4, Math.min(1.8, Math.sqrt(ratio) * 1.3));
        const estimatedQuality = Math.max(0.15, Math.min(0.9, ratio * 0.75));
        return { scale: estimatedScale, quality: estimatedQuality };
      }
    }
  };

  const processPdfWithParams = async (
    file: File,
    scale: number,
    quality: number,
    onProgress: (p: number, text: string) => void
  ) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    const outputPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      onProgress(
        Math.round(10 + (80 * i) / numPages),
        `Compressing page ${i} of ${numPages}...`
      );

      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D context unavailable');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport, canvas }).promise;

      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      const jpegBytes = await fetch(jpegDataUrl).then((res) => res.arrayBuffer());

      const embeddedImage = await outputPdf.embedJpg(jpegBytes);
      const newPage = outputPdf.addPage([embeddedImage.width, embeddedImage.height]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width,
        height: embeddedImage.height,
      });
    }

    onProgress(95, 'Optimizing document structure...');
    const pdfBytes = await outputPdf.save({ useObjectStreams: true });
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return { blob, numPages };
  };

  const compressPdf = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(5);
    setStatusText(t('tool.processing') || 'Reading document...');
    setResult(null);

    try {
      const originalSizeBytes = selectedFile.size;

      if (preset === 'target') {
        const targetSizeBytes =
          targetUnit === 'MB' ? targetValue * 1024 * 1024 : targetValue * 1024;
        
        let initialRatio = Math.min(1.0, targetSizeBytes / originalSizeBytes);
        let { scale, quality } = getCompressionParameters(initialRatio);

        let { blob, numPages } = await processPdfWithParams(
          selectedFile,
          scale,
          quality,
          (p, text) => {
            setProgress(Math.round(p * 0.7));
            setStatusText(text);
          }
        );

        // If compressed size is larger than target size, refine pass once
        if (blob.size > targetSizeBytes && quality > 0.15) {
          setStatusText('Target size check: Refining compression...');
          const adjustmentRatio = targetSizeBytes / blob.size;
          scale = Math.max(0.35, scale * Math.sqrt(adjustmentRatio));
          quality = Math.max(0.12, quality * adjustmentRatio);

          const secondPass = await processPdfWithParams(
            selectedFile,
            scale,
            quality,
            (p, text) => {
              setProgress(Math.round(70 + p * 0.25));
              setStatusText(`Refining pass: ${text}`);
            }
          );
          blob = secondPass.blob;
        }

        const blobUrl = URL.createObjectURL(blob);
        const compressedSizeBytes = blob.size;
        const percentSaved = Math.max(
          0,
          Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100)
        );

        setResult({
          fileName: selectedFile.name,
          originalSizeBytes,
          compressedSizeBytes,
          blobUrl,
          pageCount: numPages,
          percentSaved,
        });

      } else {
        const { scale, quality } = getCompressionParameters();
        const { blob, numPages } = await processPdfWithParams(
          selectedFile,
          scale,
          quality,
          (p, text) => {
            setProgress(p);
            setStatusText(text);
          }
        );

        const blobUrl = URL.createObjectURL(blob);
        const compressedSizeBytes = blob.size;
        const percentSaved = Math.max(
          0,
          Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100)
        );

        setResult({
          fileName: selectedFile.name,
          originalSizeBytes,
          compressedSizeBytes,
          blobUrl,
          pageCount: numPages,
          percentSaved,
        });
      }

      setProgress(100);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || t('tool.error') || 'Error compressing PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="compress-pdf"
        title={t('tool.compressPdf.title')}
        description={t('tool.compressPdf.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {!selectedFile ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload PDF File to Compress"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs sm:max-w-md">
                    {selectedFile.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Original Size: {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedFile(null);
                  setResult(null);
                }}
                className="text-[10px] text-slate-400 hover:text-brand-500 font-bold hover:underline"
              >
                Change PDF
              </button>
            </div>

            {isProcessing && (
              <div className="py-16 text-center">
                <ProgressBar progress={progress} statusText={statusText} />
              </div>
            )}

            {result && !isProcessing && (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-6">
                <div className="flex items-center gap-3 text-green-600 dark:text-green-400 font-bold text-sm">
                  <CheckCircle2 size={20} />
                  <span>Compression Complete!</span>
                </div>

                {/* Compression Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Original Size
                    </span>
                    <span className="text-base font-extrabold text-slate-700 dark:text-slate-300">
                      {formatFileSize(result.originalSizeBytes)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 text-center">
                    <span className="text-[10px] text-brand-600 dark:text-brand-400 uppercase font-bold block mb-1">
                      Compressed Size
                    </span>
                    <span className="text-base font-extrabold text-brand-600 dark:text-brand-400">
                      {formatFileSize(result.compressedSizeBytes)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 text-center">
                    <span className="text-[10px] text-green-600 dark:text-green-400 uppercase font-bold block mb-1">
                      Reduced By
                    </span>
                    <span className="text-base font-extrabold text-green-600 dark:text-green-400">
                      -{result.percentSaved}%
                    </span>
                  </div>
                </div>

                {/* Download and Print Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <a
                    href={result.blobUrl}
                    download={`compressed_${selectedFile.name}`}
                    className="py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-600/10 transition-all hover:scale-[1.02]"
                  >
                    <Download size={16} />
                    <span>Download Compressed PDF</span>
                  </a>

                  <button
                    onClick={() => {
                      const win = window.open(result.blobUrl);
                      win?.print();
                    }}
                    className="py-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Print Document</span>
                  </button>
                </div>
              </div>
            )}

            {!result && !isProcessing && (
              <div className="py-16 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-card/50">
                <FileDown className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-250">
                  Ready to Compress
                </h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Choose Target Size (KB/MB) or a Preset on the right and click "Compress PDF Now".
                </p>
              </div>
            )}
          </div>

          {/* Settings / Controls */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <Zap size={16} className="text-brand-500" />
                <span>Compression Mode</span>
              </h3>

              <div className="space-y-3">
                {[
                  {
                    id: 'target',
                    title: 'Target File Size (KB / MB)',
                    desc: 'Enter target size limit (e.g., 200 KB or 1 MB for uploads).',
                    badge: 'Custom Size',
                  },
                  {
                    id: 'recommended',
                    title: 'Recommended Compression',
                    desc: 'Optimal balance between visual quality and small file size.',
                    badge: 'Popular',
                  },
                  {
                    id: 'extreme',
                    title: 'Extreme Compression',
                    desc: 'Maximum size reduction for strict file limits.',
                    badge: 'Smallest',
                  },
                  {
                    id: 'low',
                    title: 'Less Compression',
                    desc: 'High resolution quality preserving maximum detail.',
                    badge: 'High Res',
                  },
                  {
                    id: 'custom',
                    title: 'Custom Quality & Scale',
                    desc: 'Fine-tune image scale & quality percentage manually.',
                    badge: 'Advanced',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPreset(item.id as CompressionPreset);
                      setResult(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      preset === item.id
                        ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        {item.id === 'target' && <Target size={14} className="text-brand-500" />}
                        {item.title}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                          preset === item.id
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* Target File Size Controls */}
              {preset === 'target' && (
                <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Set Maximum Target File Size
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="100000"
                      value={targetValue}
                      onChange={(e) => setTargetValue(Math.max(1, Number(e.target.value)))}
                      className="flex-1 px-3 py-2 text-xs font-extrabold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                    <div className="grid grid-cols-2 gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setTargetUnit('KB')}
                        className={`px-3 py-1 text-[10px] font-bold rounded ${
                          targetUnit === 'KB'
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        KB
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetUnit('MB')}
                        className={`px-3 py-1 text-[10px] font-bold rounded ${
                          targetUnit === 'MB'
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        MB
                      </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium">
                    The compressor will optimize rendering parameters to bring your file size under {targetValue} {targetUnit}.
                  </p>
                </div>
              )}

              {/* Custom controls if custom selected */}
              {preset === 'custom' && (
                <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <span>JPEG Quality</span>
                      <span className="text-brand-500 font-bold">{customQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="95"
                      value={customQuality}
                      onChange={(e) => setCustomQuality(Number(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <span>Resolution Scale</span>
                      <span className="text-brand-500 font-bold">{customScale}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={customScale}
                      onChange={(e) => setCustomScale(Number(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={compressPdf}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                >
                  <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                  <span>Compress PDF Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO Content & FAQ Section */}
      <SEOSection toolId="compress-pdf" />
    </div>
  );
};

export default CompressPdf;
