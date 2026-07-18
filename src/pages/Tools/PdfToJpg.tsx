import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Download, FileImage, RefreshCw } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface ConvertedImage {
  pageNumber: number;
  dataUrl: string;
  filename: string;
}

export const PdfToJpg: React.FC = () => {
  const { t } = useLanguage();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [images, setImages] = useState<ConvertedImage[]>([]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    setImages([]);
    
    const buffer = await file.arrayBuffer();
    setArrayBuffer(buffer);
  };

  const convertPdfToImages = async () => {
    if (!arrayBuffer || !pdfFile) return;

    setIsProcessing(true);
    setProgress(10);
    setLoadingText('Loading PDF structure...');
    setImages([]);

    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      // Determine rendering scale
      let scale = 1.5; // Medium
      if (quality === 'low') scale = 1.0;
      if (quality === 'high') scale = 2.5;

      const renderedImages: ConvertedImage[] = [];

      for (let i = 1; i <= numPages; i++) {
        setLoadingText(`Rendering page ${i} of ${numPages}...`);
        setProgress(Math.round(10 + (90 * i) / numPages));

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Canvas 2D context not available');
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport, canvas }).promise;

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const extension = format === 'png' ? 'png' : 'jpg';
        const dataUrl = canvas.toDataURL(mimeType, 0.92);

        renderedImages.push({
          pageNumber: i,
          dataUrl,
          filename: `${pdfFile.name.replace(/\.[^/.]+$/, "")}_page_${i}.${extension}`
        });
      }

      setImages(renderedImages);
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error rendering PDF. Please make sure the PDF is not encrypted or corrupt.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="pdf-to-jpg"
        title={t('tool.pdfToJpg.title')}
        description={t('tool.pdfToJpg.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {!pdfFile ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload PDF Document"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-105 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {images.length > 0 ? `Rendered Images (${images.length})` : `Ready to Convert: ${pdfFile.name}`}
              </h3>
              
              <button
                onClick={() => {
                  setPdfFile(null);
                  setArrayBuffer(null);
                  setImages([]);
                }}
                className="text-[10px] text-slate-455 hover:text-brand-500 font-bold hover:underline"
              >
                Upload Different PDF
              </button>
            </div>

            {isProcessing && (
              <div className="py-20 text-center">
                <ProgressBar progress={progress} statusText={loadingText} />
              </div>
            )}

            {images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {images.map((img) => (
                  <div
                    key={img.pageNumber}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-3 shadow-sm flex flex-col justify-between"
                  >
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center relative group">
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNumber}`}
                        className="max-h-full max-w-full object-contain"
                      />
                      
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-white font-bold text-[9px] px-2 py-0.5 rounded">
                        Page {img.pageNumber}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-semibold mt-3 truncate">
                      {img.filename}
                    </div>

                    <a
                      href={img.dataUrl}
                      download={img.filename}
                      className="w-full py-2 bg-brand-500/10 hover:bg-brand-500 text-brand-600 dark:text-brand-400 hover:text-white font-bold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition-all mt-3.5"
                    >
                      <Download size={12} />
                      <span>Download Image</span>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              !isProcessing && (
                <div className="py-16 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-card/50">
                  <FileImage className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-250">Conversion Pending</h4>
                  <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Select your desired output formats in the configuration panel and hit "Convert PDF" to begin rendering.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Configuration Panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <FileImage size={16} className="text-brand-500" />
                <span>Image Configuration</span>
              </h3>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                {/* Format */}
                <div className="space-y-1.5">
                  <label>Output Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setFormat('jpg'); setImages([]); }}
                      className={`py-1.5 rounded-lg border text-center font-bold ${
                        format === 'jpg'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      JPG (JPEG)
                    </button>
                    <button
                      onClick={() => { setFormat('png'); setImages([]); }}
                      className={`py-1.5 rounded-lg border text-center font-bold ${
                        format === 'png'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      PNG (Lossless)
                    </button>
                  </div>
                </div>

                {/* Quality */}
                <div className="space-y-1.5">
                  <label>Render Quality (DPI/Scale)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'low', label: '1.0x (Fast)' },
                      { key: 'medium', label: '1.5x (Normal)' },
                      { key: 'high', label: '2.5x (High-Res)' }
                    ].map((q) => (
                      <button
                        key={q.key}
                        onClick={() => { setQuality(q.key as any); setImages([]); }}
                        className={`py-2 rounded-lg border text-center text-[10px] font-bold ${
                          quality === q.key
                            ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                {images.length > 0 ? (
                  <button
                    onClick={() => setImages([])}
                    className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Reset Conversion</span>
                  </button>
                ) : (
                  <button
                    onClick={convertPdfToImages}
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                  >
                    <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                    <span>Convert PDF to Images</span>
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

export default PdfToJpg;
