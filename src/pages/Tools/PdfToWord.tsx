import React, { useState, useEffect } from 'react';
import { Download, FileText, RefreshCw, CheckCircle2, ShieldCheck, Layers, Grid, Image as ImageIcon, Sparkles, Key } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';
import { convertPdfBufferToDocx, type ConversionResult } from '../../utils/pdfToDocxEngine';
import { convertPdfBufferWithAiVision } from '../../utils/aiPdfToDocxEngine';

export const PdfToWord: React.FC = () => {
  const { t } = useLanguage();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  
  const [conversionMode, setConversionMode] = useState<'standard' | 'ai'>('standard');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'diagnostics'>('preview');

  useEffect(() => {
    const savedKey = localStorage.getItem('tools_cafe_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
    if (savedKey) {
      setGeminiApiKey(savedKey);
    }
  }, []);

  const handleApiKeyChange = (val: string) => {
    setGeminiApiKey(val);
    localStorage.setItem('tools_cafe_gemini_key', val);
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    setConversionResult(null);
    const buffer = await file.arrayBuffer();
    setArrayBuffer(buffer);
  };

  const convertPdfToWord = async () => {
    if (!arrayBuffer || !pdfFile) return;

    if (conversionMode === 'ai' && !geminiApiKey) {
      alert('Please enter your Gemini API Key to use AI Vision mode, or switch to Standard Mode.');
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setLoadingText(
      conversionMode === 'ai'
        ? 'Initializing Gemini AI Vision layout engine...'
        : 'Initializing layout analysis engine...'
    );

    try {
      let result: ConversionResult;

      if (conversionMode === 'ai') {
        result = await convertPdfBufferWithAiVision(arrayBuffer, geminiApiKey, (prog, msg) => {
          setProgress(prog);
          setLoadingText(msg);
        });
      } else {
        result = await convertPdfBufferToDocx(arrayBuffer, (prog, msg) => {
          setProgress(prog);
          setLoadingText(msg);
        });
      }

      setConversionResult(result);
      downloadDocxBlob(result.docxBlob, pdfFile.name);
    } catch (err: any) {
      console.error('PDF to Word Conversion error:', err);
      alert(`Conversion error: ${err?.message || 'Failed to process PDF layout.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDocxBlob = (blob: Blob, originalName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = originalName.replace(/\.[^/.]+$/, "");
    link.setAttribute('download', `${cleanName}_converted.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadTxt = () => {
    if (!conversionResult) return;
    let text = '';
    conversionResult.extractedPages.forEach((page) => {
      text += `--- Page ${page.pageNumber} ---\n\n`;
      text += `${page.text}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${pdfFile?.name.replace(/\.[^/.]+$/, "")}_extracted.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="pdf-to-word"
        title={t('tool.pdfToWord.title') || "PDF to Word (DOCX) Converter"}
        description={t('tool.pdfToWord.desc') || "Enterprise-grade PDF layout & AI Vision engine converting PDFs into native, 100% editable Microsoft Word (.docx) files."}
        category="pdf"
        categoryName="PDF Tools"
      />

      {/* Mode Selector Header */}
      <div className="max-w-2xl mx-auto mb-8 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center gap-2">
        <button
          onClick={() => setConversionMode('standard')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            conversionMode === 'standard'
              ? 'bg-white dark:bg-dark-card text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText size={15} />
          <span>Standard Layout Engine (Fast)</span>
        </button>

        <button
          onClick={() => setConversionMode('ai')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            conversionMode === 'ai'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Sparkles size={15} />
          <span>AI Vision Engine (Gemini 2.5)</span>
        </button>
      </div>

      {/* AI Key input if AI mode active */}
      {conversionMode === 'ai' && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <Key size={14} className="text-purple-600" />
              <span>Gemini API Key Required for AI Vision</span>
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-purple-600 dark:text-purple-300 underline font-semibold"
            >
              Get Free API Key
            </a>
          </div>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={geminiApiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-dark-card border border-purple-200 dark:border-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-slate-800 dark:text-slate-100"
          />
        </div>
      )}

      {!pdfFile ? (
        <div className="max-w-2xl mx-auto">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label={`Upload PDF for ${conversionMode === 'ai' ? 'AI Vision' : 'DOCX'} Conversion`}
          />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Editable OpenXML</span>
              <span className="text-[10px] text-slate-400">Native Word .docx elements</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                {conversionMode === 'ai' ? 'AI Table Parsing' : 'Table & Grid Parsing'}
              </span>
              <span className="text-[10px] text-slate-400">Preserves cells & structure</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">100% Client Privacy</span>
              <span className="text-[10px] text-slate-400">Processed locally in browser</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {pdfFile.name}
                </h3>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-mono">
                  {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              
              <button
                onClick={() => {
                  setPdfFile(null);
                  setArrayBuffer(null);
                  setConversionResult(null);
                }}
                className="text-[11px] text-slate-400 hover:text-indigo-500 font-semibold hover:underline"
              >
                Choose another file
              </button>
            </div>

            {isProcessing && (
              <div className="py-20 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-6 shadow-sm">
                <ProgressBar progress={progress} statusText={loadingText} />
                <p className="text-[11px] text-slate-400 mt-4">
                  {conversionMode === 'ai'
                    ? 'AI Multimodal Vision analyzing page visual layouts & tables...'
                    : 'Parsing coordinates, fonts, tables, lists, and line bounds...'}
                </p>
              </div>
            )}

            {!isProcessing && conversionResult && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-6 shadow-sm space-y-4 animate-fade-in">
                {/* Tabs Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'preview'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Extracted Text Preview
                    </button>
                    <button
                      onClick={() => setActiveTab('diagnostics')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'diagnostics'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Conversion Diagnostics
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={13} />
                    <span>Score: {conversionResult.qualityScore}%</span>
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'preview' ? (
                  <div className="max-h-[460px] overflow-y-auto pr-2 space-y-4 font-sans text-xs">
                    {conversionResult.extractedPages.map((page) => (
                      <div
                        key={page.pageNumber}
                        className="space-y-2 pb-4 border-b border-dashed border-slate-100 dark:border-slate-800/80 last:border-b-0"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                          <span>Page {page.pageNumber}</span>
                          {page.hasTable && (
                            <span className="bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded text-[9px] text-indigo-600 dark:text-indigo-300">
                              Table Detected
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {page.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                      <Layers className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-100 block">
                        {conversionResult.pageCount}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Pages</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                      <FileText className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-100 block">
                        {conversionResult.paragraphCount}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Paragraphs</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                      <Grid className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-100 block">
                        {conversionResult.tableCount}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Tables Formatted</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                      <ImageIcon className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-100 block">
                        {conversionResult.imageCount}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Embedded Images</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isProcessing && !conversionResult && (
              <div className="py-24 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-card/50">
                <FileText className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-250">Conversion Ready</h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Click "Convert PDF to Word (.docx)" to extract layout structures and compile native OpenXML documents.
                </p>
              </div>
            )}
          </div>

          {/* Configuration & Action Panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-4">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck size={16} className="text-indigo-500" />
                <span>Conversion Controls</span>
              </h3>

              {conversionResult ? (
                <div className="space-y-3 text-xs font-semibold">
                  <button
                    onClick={() => downloadDocxBlob(conversionResult.docxBlob, pdfFile.name)}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                  >
                    <Download size={15} />
                    <span>Download Word (.docx)</span>
                  </button>

                  <button
                    onClick={downloadTxt}
                    className="w-full py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={14} />
                    <span>Export Plain Text (.txt)</span>
                  </button>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setConversionResult(null)}
                      className="w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold text-xs"
                    >
                      Re-run Layout Analysis
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={convertPdfToWord}
                  disabled={isProcessing}
                  className={`w-full py-3.5 rounded-xl disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] ${
                    conversionMode === 'ai'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-purple-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                  <span>
                    {conversionMode === 'ai'
                      ? 'Convert with AI Vision (.docx)'
                      : 'Convert PDF to Word (.docx)'}
                  </span>
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
