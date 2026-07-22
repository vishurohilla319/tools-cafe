import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Trash2, Download, CheckCircle } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PageThumbnail {
  pageNumber: number;
  previewUrl: string;
}

export const DeletePdfPages: React.FC = () => {
  const { t } = useLanguage();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]); // 1-indexed list of page numbers to delete
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    setThumbnails([]);
    setSelectedPages([]);
    setResultBlobUrl(null);
    setIsProcessing(true);
    setLoadingText('Reading PDF...');
    setProgress(15);

    try {
      const buffer = await file.arrayBuffer();
      setArrayBuffer(buffer);
      setProgress(40);
      setLoadingText('Rendering thumbnails...');
      
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const generatedThumbs: PageThumbnail[] = [];

      for (let i = 1; i <= numPages; i++) {
        setLoadingText(`Rendering page ${i} of ${numPages}...`);
        setProgress(Math.round(40 + (50 * i) / numPages));

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 }); // scale down for small card thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport, canvas }).promise;
          generatedThumbs.push({
            pageNumber: i,
            previewUrl: canvas.toDataURL()
          });
        }
      }

      setThumbnails(generatedThumbs);
    } catch (err) {
      console.error(err);
      alert('Error loading PDF pages. Ensure it is a valid, unencrypted PDF.');
      setPdfFile(null);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const togglePageSelection = (pageNumber: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNumber)
        ? prev.filter((n) => n !== pageNumber)
        : [...prev, pageNumber]
    );
    setResultBlobUrl(null);
  };

  const deleteSelectedPages = async () => {
    if (!arrayBuffer || selectedPages.length === 0) return;
    
    if (selectedPages.length === thumbnails.length) {
      alert('You cannot delete all pages from the PDF. At least one page must remain.');
      return;
    }

    setIsProcessing(true);
    setProgress(30);
    setLoadingText('Rebuilding PDF...');

    try {
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const newDoc = await PDFDocument.create();
      
      const indicesToKeep: number[] = [];
      for (let i = 0; i < thumbnails.length; i++) {
        // 0-indexed page indices for pdf-lib vs 1-indexed pageNumbers
        const pageNum = i + 1;
        if (!selectedPages.includes(pageNum)) {
          indicesToKeep.push(i);
        }
      }

      setProgress(60);
      const copiedPages = await newDoc.copyPages(srcDoc, indicesToKeep);
      copiedPages.forEach((page) => newDoc.addPage(page));

      setProgress(90);
      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setResultBlobUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error rebuilding PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="delete-pdf-pages"
        title={t('tool.deletePdf.title')}
        description={t('tool.deletePdf.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {!pdfFile ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload PDF File"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main pages thumbnail viewer */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Select pages to delete ({pdfFile.name})
                </h3>
              </div>
              <button
                onClick={() => {
                  setPdfFile(null);
                  setArrayBuffer(null);
                  setThumbnails([]);
                  setSelectedPages([]);
                  setResultBlobUrl(null);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-650 hover:underline font-bold"
              >
                Upload Different File
              </button>
            </div>

            {isProcessing && thumbnails.length === 0 ? (
              <div className="py-20 text-center">
                <ProgressBar progress={progress} statusText={loadingText} />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {thumbnails.map((thumb) => {
                  const isDeleted = selectedPages.includes(thumb.pageNumber);
                  return (
                    <div
                      key={thumb.pageNumber}
                      onClick={() => togglePageSelection(thumb.pageNumber)}
                      className={`group rounded-xl border p-2 cursor-pointer transition-all relative overflow-hidden flex flex-col items-center select-none ${
                        isDeleted
                          ? 'border-red-500 bg-red-500/5 dark:bg-red-950/10 scale-[0.97]'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card hover:scale-[1.02] hover:shadow-md'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="aspect-[3/4] w-full rounded overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                        <img
                          src={thumb.previewUrl}
                          alt={`Page ${thumb.pageNumber}`}
                          className={`max-h-full max-w-full object-contain transition-opacity duration-200 ${
                            isDeleted ? 'opacity-40' : 'opacity-100'
                          }`}
                        />
                        
                        {/* Status overlays */}
                        {isDeleted ? (
                          <div className="absolute inset-0 bg-red-900/10 flex items-center justify-center">
                            <div className="px-2.5 py-1 rounded bg-red-650 text-white font-bold text-[9px] flex items-center gap-1">
                              <Trash2 size={10} />
                              <span>DELETING</span>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-5 h-5 rounded-full bg-slate-950/80 flex items-center justify-center">
                              <CheckCircle size={12} className="text-emerald-400" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="text-[10px] font-bold text-slate-500 mt-2 text-center">
                        Page {thumb.pageNumber}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <Trash2 size={16} className="text-red-500" />
                <span>Delete Pages</span>
              </h3>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                <div className="flex justify-between items-center text-[11px] border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <span>Total Pages:</span>
                  <span className="font-bold">{thumbnails.length}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <span>Pages Selected to Delete:</span>
                  <span className="font-bold text-red-500">{selectedPages.length}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <span>Output Page Count:</span>
                  <span className="font-bold text-green-500">
                    {thumbnails.length - selectedPages.length}
                  </span>
                </div>
              </div>

              {isProcessing && thumbnails.length > 0 && (
                <div className="mt-6">
                  <ProgressBar progress={progress} statusText={loadingText} />
                </div>
              )}

              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
                {resultBlobUrl ? (
                  <>
                    <a
                      href={resultBlobUrl}
                      download={`trimmed_${pdfFile.name}`}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                    >
                      <Download size={15} />
                      <span>Download trimmed PDF</span>
                    </a>
                    
                    <button
                      onClick={() => {
                        const win = window.open(resultBlobUrl);
                        win?.print();
                      }}
                      className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Print Document</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedPages([]);
                        setResultBlobUrl(null);
                      }}
                      className="w-full text-center text-[10px] font-bold text-slate-400 hover:underline"
                    >
                      Reset Deletions
                    </button>
                  </>
                ) : (
                  <button
                    onClick={deleteSelectedPages}
                    disabled={selectedPages.length === 0 || isProcessing}
                    className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 transition-all hover:scale-[1.02]"
                  >
                    <Trash2 size={14} />
                    <span>Delete Pages & Compile</span>
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

export default DeletePdfPages;
