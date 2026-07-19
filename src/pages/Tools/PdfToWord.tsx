import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Download, FileText, RefreshCw, Eye } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PageParagraphs {
  pageNumber: number;
  paragraphs: string[];
}

export const PdfToWord: React.FC = () => {
  const { t } = useLanguage();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  
  const [documentContent, setDocumentContent] = useState<PageParagraphs[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    setDocumentContent([]);
    const buffer = await file.arrayBuffer();
    setArrayBuffer(buffer);
  };

  const convertPdfToWord = async () => {
    if (!arrayBuffer || !pdfFile) return;

    setIsProcessing(true);
    setProgress(10);

    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const isServerConversion = !!supabaseUrl;

    if (isServerConversion) {
      setLoadingText('Connecting to Supabase Edge Server...');
      try {
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('output_format', 'docx');

        setProgress(40);
        setLoadingText('Sending file to Supabase Edge Function (converting to editable Word)...');

        const convertApiSecret = import.meta.env.VITE_CONVERT_API_SECRET || '';
        const headers: { [key: string]: string } = {
          'apikey': supabaseAnonKey,
        };
        if (convertApiSecret) {
          headers['x-convert-api-secret'] = convertApiSecret;
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/convert-file`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errData.error || `Server conversion failed with status ${response.status}`);
        }

        setProgress(85);
        setLoadingText('Downloading Word Document...');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${pdfFile.name.replace(/\.[^/.]+$/, "")}_converted.doc`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setProgress(100);
        setIsProcessing(false);
        return;

      } catch (err: any) {
        console.warn('Supabase native conversion failed, falling back to local text extraction:', err);
      }
    }

    setLoadingText('Initializing PDF reader (local fallback)...');
    setProgress(20);
    setDocumentContent([]);

    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const parsedPages: PageParagraphs[] = [];

      for (let i = 1; i <= numPages; i++) {
        setLoadingText(`Extracting text from page ${i} of ${numPages}...`);
        setProgress(Math.round(10 + (80 * i) / numPages));

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];

        if (items.length === 0) {
          parsedPages.push({ pageNumber: i, paragraphs: [] });
          continue;
        }

        // Simple line grouping by Y-coordinate tolerance
        const tolerance = 5;
        const lineGroups: { [y: number]: any[] } = {};

        items.forEach((item) => {
          if (!item.str.trim()) return;
          const y = item.transform[5];
          const key = Object.keys(lineGroups).find((k) => Math.abs(Number(k) - y) < tolerance);
          if (key) {
            lineGroups[Number(key)].push(item);
          } else {
            lineGroups[y] = [item];
          }
        });

        // Sort Y coordinates descending (top-to-bottom)
        const sortedY = Object.keys(lineGroups)
          .map(Number)
          .sort((a, b) => b - a);

        const pageLines: string[] = [];

        sortedY.forEach((y) => {
          const rowItems = lineGroups[y];
          // Sort X coordinates ascending (left-to-right)
          rowItems.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
          const lineText = rowItems.map((item: any) => item.str).join(' ');
          pageLines.push(lineText);
        });

        // Merge lines into paragraphs
        // If a line ends with a period, question mark, or exclamation, or is significantly short, we treat it as paragraph end.
        const pageParagraphs: string[] = [];
        let currentParagraph = '';

        pageLines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          if (!currentParagraph) {
            currentParagraph = trimmed;
          } else {
            currentParagraph += ' ' + trimmed;
          }

          const lastChar = trimmed.slice(-1);
          if (['.', '?', '!', ':'].includes(lastChar) || trimmed.length < 50) {
            pageParagraphs.push(currentParagraph);
            currentParagraph = '';
          }
        });

        if (currentParagraph) {
          pageParagraphs.push(currentParagraph);
        }

        parsedPages.push({
          pageNumber: i,
          paragraphs: pageParagraphs.length > 0 ? pageParagraphs : ['[No text elements detected on this page]']
        });
      }

      setDocumentContent(parsedPages);
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error parsing PDF file. Please verify it is a valid, unencrypted text PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadWordDoc = () => {
    if (documentContent.length === 0) return;

    // Create Microsoft Word HTML structure (officially supported for Word importing)
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Exported PDF Text</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            margin: 1in;
          }
          p {
            margin-bottom: 12pt;
          }
          .page-break {
            page-break-before: always;
          }
        </style>
      </head>
      <body>
    `;

    documentContent.forEach((page, idx) => {
      if (idx > 0) {
        html += `<div class="page-break"></div>`;
      }
      
      html += `<h3>Page ${page.pageNumber}</h3>`;
      
      page.paragraphs.forEach((p) => {
        html += `<p>${p}</p>`;
      });
    });

    html += `</body></html>`;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${pdfFile?.name.replace(/\.[^/.]+$/, "")}_converted.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTxt = () => {
    if (documentContent.length === 0) return;
    
    let text = '';
    documentContent.forEach((page) => {
      text += `--- Page ${page.pageNumber} ---\n\n`;
      page.paragraphs.forEach((p) => {
        text += `${p}\n\n`;
      });
      text += `\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${pdfFile?.name.replace(/\.[^/.]+$/, "")}_text.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="pdf-to-word"
        title={t('tool.pdfToWord.title')}
        description={t('tool.pdfToWord.desc')}
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
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250">
                PDF Document: {pdfFile.name}
              </h3>
              
              <button
                onClick={() => {
                  setPdfFile(null);
                  setArrayBuffer(null);
                  setDocumentContent([]);
                }}
                className="text-[10px] text-slate-450 hover:text-brand-500 font-bold hover:underline"
              >
                Upload Different PDF
              </button>
            </div>

            {isProcessing && (
              <div className="py-20 text-center">
                <ProgressBar progress={progress} statusText={loadingText} />
              </div>
            )}

            {!isProcessing && documentContent.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-6 shadow-sm overflow-hidden animate-fade-in">
                <div className="pb-3 mb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs font-bold text-slate-655 dark:text-slate-350">
                  <Eye size={14} className="text-brand-500" />
                  <span>Extracted Paragraphs Preview</span>
                </div>
                
                <div className="max-h-[450px] overflow-y-auto pr-2 space-y-4">
                  {documentContent.map((page) => (
                    <div key={page.pageNumber} className="space-y-2 pb-4 border-b border-dashed border-slate-100 dark:border-slate-800/80 last:border-b-0">
                      <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                        Page {page.pageNumber}
                      </h4>
                      {page.paragraphs.map((p, idx) => (
                        <p key={idx} className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed text-justify">
                          {p}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !isProcessing && (
                <div className="py-24 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-card/50">
                  <FileText className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-250">Extraction Pending</h4>
                  <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Hit "Convert PDF to Word" to scan layout characters and group sentences into paragraphs.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Configuration & Action Panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <FileText size={16} className="text-brand-500" />
                <span>Actions</span>
              </h3>

              {documentContent.length > 0 ? (
                <div className="space-y-3 text-xs font-semibold">
                  <button
                    onClick={downloadWordDoc}
                    className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                  >
                    <Download size={14} />
                    <span>Download Word Document (.doc)</span>
                  </button>

                  <button
                    onClick={downloadTxt}
                    className="w-full py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={14} />
                    <span>Download Text File (.txt)</span>
                  </button>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => setDocumentContent([])}
                      className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-550 font-bold text-xs"
                    >
                      Reset Conversion
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={convertPdfToWord}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                >
                  <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                  <span>Convert PDF to Word</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfToWord;
