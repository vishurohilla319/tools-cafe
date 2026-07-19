import React, { useState } from 'react';
// @ts-ignore
import { renderAsync } from 'docx-preview';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Settings, FileText, ArrowRight, Download, CheckCircle, FileUp, Sparkles } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

export const WordToPdf: React.FC = () => {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  
  // Format configurations
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [margins, setMargins] = useState<'narrow' | 'normal' | 'wide'>('normal');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  
  // Conversion state
  const [isConverted, setIsConverted] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setFileBuffer(null);
    setIsConverted(false);
    setPdfBlob(null);

    setIsProcessing(true);
    setProgress(50);
    setLoadingText('Uploading and reading Word document structure...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      setFileBuffer(buffer);
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      alert('Error reading DOCX file. Ensure the file is not corrupted.');
      setFile(null);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const getMarginStyle = () => {
    if (margins === 'narrow') return '10mm';
    if (margins === 'wide') return '25mm';
    return '18mm'; // normal
  };

  const generatePdfBlob = (buffer: ArrayBuffer): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // Create isolated sandboxed hidden iframe inside viewport to allow html2canvas rendering
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '0';
        iframe.style.top = '0';
        iframe.style.width = pageSize === 'a4' ? '210mm' : '8.5in';
        iframe.style.height = '297mm'; // standard height for rendering pages
        iframe.style.border = 'none';
        iframe.style.zIndex = '-9999';
        iframe.style.opacity = '0.01';
        iframe.style.pointerEvents = 'none';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          document.body.removeChild(iframe);
          reject(new Error('Cannot access iframe document context'));
          return;
        }

        // Target rendering container inside iframe
        const container = iframeDoc.createElement('div');
        iframeDoc.body.appendChild(container);

        // Render docx directly into the iframe container preserving colors, tables, headers, footers & alignments
        renderAsync(buffer, container, iframeDoc.head, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          experimental: true,
          useBase64URL: true,
        }).then(() => {
          // Document rendered successfully.
          // Apply scoped styles corresponding to high-fidelity PDF rendering after docx-preview has injected its default styles
          const style = iframeDoc.createElement('style');
          style.innerHTML = `
            body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
            }
            /* Override docx-preview wrapper styling to extract raw page elements */
            .docx-wrapper {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .docx {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: ${getMarginStyle()} !important;
              box-sizing: border-box !important;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
              overflow: visible !important;
            }
            body .docx-wrapper section * {
              height: auto !important;
              max-height: none !important;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
              overflow: visible !important;
              line-height: 1.25 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            }
          `;
          iframeDoc.head.appendChild(style);

          // Give a short 250ms window to resolve fonts/images
          setTimeout(() => {
            const elementToConvert = iframeDoc.querySelector('.docx-wrapper');
            if (!elementToConvert) {
              document.body.removeChild(iframe);
              reject(new Error('Rendered document has no readable wrapper'));
              return;
            }

            const opt = {
              margin: 0,
              filename: 'document.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { 
                scale: 2.2, 
                useCORS: true, 
                logging: false,
                backgroundColor: '#ffffff'
              },
              jsPDF: { 
                unit: 'mm', 
                format: pageSize, 
                orientation: 'portrait' 
              },
              pagebreak: { 
                mode: ['css', 'legacy'],
                avoid: 'tr, td, p, h1, h2, h3, h4, h5, h6' // Prevent breaks inside table rows/headers/paragraphs
              }
            };

            // Copy all styles from iframe to parent document so html2pdf can render the cloned element with correct styles
            const clonedStyles: Node[] = [];
            const iframeStyles = iframeDoc.querySelectorAll('style, link[rel="stylesheet"]');
            iframeStyles.forEach((style) => {
              const clone = style.cloneNode(true);
              clonedStyles.push(clone);
              document.head.appendChild(clone);
            });

            const html2pdfFn = (html2pdf as any).default || html2pdf;

            html2pdfFn().set(opt).from(elementToConvert).outputPdf('blob').then((blob: Blob) => {
              // Clean up cloned styles
              clonedStyles.forEach((style) => {
                try { document.head.removeChild(style); } catch (e) {}
              });
              document.body.removeChild(iframe);
              resolve(blob);
            }).catch((err: any) => {
              // Clean up cloned styles on error
              clonedStyles.forEach((style) => {
                try { document.head.removeChild(style); } catch (e) {}
              });
              document.body.removeChild(iframe);
              reject(err);
            });
          }, 250);
        }).catch((err: any) => {
          document.body.removeChild(iframe);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  const runClientSideConversion = async () => {
    if (!fileBuffer) return;
    setProgress(50);
    setLoadingText('Running high-fidelity local conversion...');
    const blob = await generatePdfBlob(fileBuffer);
    setPdfBlob(blob);
    setIsConverted(true);
    setProgress(100);

    // Automatically trigger file download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file ? file.name.replace(/\.[^/.]+$/, "") + ".pdf" : "document.pdf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertWordToPdf = async () => {
    if (!fileBuffer || !file) return;

    setIsProcessing(true);
    setProgress(10);
    
    // Check if Supabase URL is configured in environment
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const isServerConversion = !!supabaseUrl;

    if (isServerConversion) {
      setLoadingText('Connecting to Supabase Edge Server...');
      try {

        const formData = new FormData();
        formData.append('file', file);
        formData.append('output_format', 'pdf');

        setProgress(40);
        setLoadingText('Sending file to Supabase Edge Function (generating selectable-text PDF)...');

        const response = await fetch(`${supabaseUrl}/functions/v1/convert-file`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
          },
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errData.error || `Server conversion failed with status ${response.status}`);
        }

        setProgress(85);
        setLoadingText('Downloading native PDF...');

        const blob = await response.blob();
        setPdfBlob(blob);
        setIsConverted(true);
        setProgress(100);

        // Automatically trigger file download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name.replace(/\.[^/.]+$/, "") + ".pdf");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } catch (err: any) {
        console.warn('Supabase native conversion failed, falling back to local client-side conversion:', err);
        // Silently and gracefully fall back to local client-side conversion without an annoying blocking alert
        await runClientSideConversion();
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    } else {
      // Local client side conversion
      try {
        await runClientSideConversion();
      } catch (err: any) {
        console.error(err);
        alert('Failed to convert Word file locally: ' + err.message);
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    }
  };

  const triggerDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file ? file.name.replace(/\.[^/.]+$/, "") + ".pdf" : "document.pdf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <ToolHeader
        toolId="word-to-pdf"
        title={t('tool.wordToPdf.title')}
        description={t('tool.wordToPdf.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {isProcessing && (
        <div className="max-w-md mx-auto my-12 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-xl text-center">
          <ProgressBar progress={progress} statusText={loadingText} />
        </div>
      )}

      {/* Screen 1: Upload (iLovePDF Style) */}
      {!file && !isProcessing && (
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 text-center relative">
            <div className="absolute top-4 right-4 bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles size={11} />
              <span>100% Offline & Private</span>
            </div>

            <div className="mb-6 mt-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
                <FileUp size={32} />
              </div>
              <h2 className="font-heading text-lg font-extrabold text-slate-850 dark:text-slate-100">
                Convert Word to PDF
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Make DOCX files easy to read by converting them to clean, layout-perfect PDF documents.
              </p>
            </div>

            <FileUpload
              accept=".docx"
              multiple={false}
              onFilesSelected={handleFilesSelected}
              label="Select WORD file"
            />
          </div>
        </div>
      )}

      {/* Screen 2: Convert Options (iLovePDF style) */}
      {file && !isConverted && !isProcessing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* File Card list (2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md flex items-center gap-4 hover:scale-[1.01] transition-transform">
              <div className="w-12 h-12 bg-red-500/10 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {file.name}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Size: {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setFileBuffer(null);
                }}
                className="text-[10px] text-slate-400 hover:text-red-600 font-bold uppercase tracking-wider"
              >
                Remove
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center">
              * Select page settings on the right panel and hit "Convert to PDF" to compile.
            </p>
          </div>

          {/* Config sidebar (1 column) */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-md">
              <h3 className="font-heading text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Settings size={14} className="text-red-600" />
                <span>Page Layout Config</span>
              </h3>

              <div className="space-y-4 text-[11px] font-bold text-slate-650 dark:text-slate-350">
                {/* Paper Format */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Paper Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPageSize('a4')}
                      className={`py-1.5 rounded-lg border text-center transition-all ${
                        pageSize === 'a4'
                          ? 'border-red-500 bg-red-500/5 text-red-600'
                          : 'border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      A4 Standard
                    </button>
                    <button
                      onClick={() => setPageSize('letter')}
                      className={`py-1.5 rounded-lg border text-center transition-all ${
                        pageSize === 'letter'
                          ? 'border-red-500 bg-red-500/5 text-red-600'
                          : 'border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      US Letter
                    </button>
                  </div>
                </div>

                {/* Page Margins */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Document Margins</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'narrow', label: 'Narrow' },
                      { key: 'normal', label: 'Normal' },
                      { key: 'wide', label: 'Wide' }
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMargins(m.key as any)}
                        className={`py-1.5 rounded-lg border text-center text-[10px] transition-all ${
                          margins === m.key
                            ? 'border-red-500 bg-red-500/5 text-red-600'
                            : 'border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <button
                  onClick={convertWordToPdf}
                  className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02]"
                >
                  <span>Convert to PDF</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen 3: Download Complete (iLovePDF Style) */}
      {isConverted && !isProcessing && (
        <div className="max-w-xl mx-auto mt-12">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle size={36} />
            </div>

            <h2 className="font-heading text-xl font-extrabold text-slate-850 dark:text-slate-100 mb-2">
              Word file has been converted to PDF!
            </h2>
            <p className="text-xs text-slate-400 mb-8 max-w-sm mx-auto">
              Your high-fidelity document download should start automatically. If not, click the button below.
            </p>

            <div className="space-y-4">
              <button
                onClick={triggerDownload}
                className="w-full max-w-sm py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/25 transition-all hover:scale-[1.02] mx-auto"
              >
                <Download size={18} />
                <span>Download PDF</span>
              </button>

              <button
                onClick={() => {
                  setFile(null);
                  setFileBuffer(null);
                  setIsConverted(false);
                  setPdfBlob(null);
                }}
                className="text-xs text-slate-500 hover:text-red-600 font-semibold block mx-auto underline transition-colors"
              >
                Convert another file
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordToPdf;
