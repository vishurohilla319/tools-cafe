import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Trash2, ArrowUp, ArrowDown, FileText, Download, Merge } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

interface PdfFile {
  id: string;
  file: File;
  name: string;
  sizeKb: number;
  pageCount: number;
}

export const MergePdf: React.FC = () => {
  const { t } = useLanguage();
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mergedBlobUrl, setMergedBlobUrl] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true);
    setProgress(20);

    const newFiles: PdfFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();

        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
          pageCount
        });
      } catch (err) {
        console.error(err);
        alert(`Failed to load "${file.name}". Ensure the file is not corrupted or password-protected.`);
      }
    }

    setPdfFiles((prev) => [...prev, ...newFiles]);
    setMergedBlobUrl(null);
    setIsProcessing(false);
    setProgress(0);
  };

  const removeFile = (id: string) => {
    setPdfFiles((prev) => prev.filter((f) => f.id !== id));
    setMergedBlobUrl(null);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === pdfFiles.length - 1) return;

    const newFiles = [...pdfFiles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setPdfFiles(newFiles);
    setMergedBlobUrl(null);
  };

  const mergePdfs = async () => {
    if (pdfFiles.length < 2) {
      alert('Please upload at least 2 PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < pdfFiles.length; i++) {
        const pdfFile = pdfFiles[i];
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        
        // Load target PDF document
        const srcPdf = await PDFDocument.load(arrayBuffer);
        
        // Flatten forms to prevent duplicate field name conflicts or empty appearance streams
        try {
          const form = srcPdf.getForm();
          form.flatten();
        } catch (e) {
          // Ignore if form doesn't exist or cannot be flattened
        }
        
        // Get pages
        const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        
        // Add pages to merged PDF
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        
        setProgress(Math.round(10 + (80 * (i + 1)) / pdfFiles.length));
      }

      const pdfBytes = await mergedPdf.save({ updateFieldAppearances: true });
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedBlobUrl(url);
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error merging PDFs. Please check that none of the documents are encrypted.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="merge-pdf"
        title={t('tool.mergePdf.title')}
        description={t('tool.mergePdf.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PDF File List */}
        <div className="lg:col-span-2 space-y-6">
          <FileUpload
            accept=".pdf"
            multiple={true}
            onFilesSelected={handleFilesSelected}
            label="Upload PDF Documents to Merge"
          />

          {pdfFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Files list ({pdfFiles.length})
                </h3>
                <button
                  onClick={() => setPdfFiles([])}
                  className="text-[10px] text-red-500 hover:underline font-bold"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2">
                {pdfFiles.map((pdf, idx) => (
                  <div
                    key={pdf.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate">
                          {pdf.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {pdf.pageCount} pages | {pdf.sizeKb} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => moveFile(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveFile(idx, 'down')}
                        disabled={idx === pdfFiles.length - 1}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => removeFile(pdf.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-red-500"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              <Merge size={16} className="text-brand-500" />
              <span>Compilation</span>
            </h3>

            <p className="text-[11px] leading-relaxed text-slate-450 dark:text-slate-400 mb-6">
              Arrange your files in the desired merge order using the up and down arrows. The output PDF will compile pages sequentially.
            </p>

            {isProcessing && <ProgressBar progress={progress} statusText="Merging PDFs..." />}

            {mergedBlobUrl ? (
              <div className="space-y-3">
                <a
                  href={mergedBlobUrl}
                  download={`merged_${Date.now()}.pdf`}
                  className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                >
                  <Download size={15} />
                  <span>Download Merged PDF</span>
                </a>

                <button
                  onClick={() => {
                    const win = window.open(mergedBlobUrl);
                    win?.print();
                  }}
                  className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Print Document</span>
                </button>

                <button
                  onClick={() => setMergedBlobUrl(null)}
                  className="w-full text-center text-[10px] font-bold text-slate-450 hover:underline"
                >
                  Re-merge Files
                </button>
              </div>
            ) : (
              <button
                onClick={mergePdfs}
                disabled={pdfFiles.length < 2 || isProcessing}
                className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
              >
                <span>Merge PDFs</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergePdf;
