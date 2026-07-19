import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { Download, RefreshCw, Settings, Eye, LayoutGrid } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

interface ExcelSheetData {
  name: string;
  rows: any[][];
}

export const ExcelToPdf: React.FC = () => {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<ExcelSheetData[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  
  // PDF layout options
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [showGridlines, setShowGridlines] = useState<boolean>(true);
  const [margins, setMargins] = useState<'narrow' | 'normal' | 'wide'>('normal');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setPdfUrl(null);
    setIsProcessing(true);
    setProgress(30);
    setLoadingText('Parsing spreadsheet file...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      const parsedSheets: ExcelSheetData[] = [];
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        // Convert to array of arrays including empty cells
        const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        if (json.length > 0) {
          parsedSheets.push({
            name: sheetName,
            rows: json
          });
        }
      });

      if (parsedSheets.length === 0) {
        throw new Error('No readable data found in the spreadsheet.');
      }

      setSheets(parsedSheets);
      setSelectedSheetIndex(0);
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error parsing Excel file. Ensure the file is not corrupted.');
      setFile(null);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };
  const generatePdf = async () => {
    if (sheets.length === 0 || !file) return;
    setIsProcessing(true);
    setProgress(10);

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
        setLoadingText('Sending file to Supabase Edge Function (generating native PDF)...');

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
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setProgress(100);
        return;

      } catch (err: any) {
        console.warn('Supabase native conversion failed, falling back to local client-side conversion:', err);
      }
    }

    setLoadingText('Initializing PDF compiler (local fallback)...');
    setProgress(20);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      // A4: 595.27 x 841.89 points
      // Letter: 612 x 792 points
      let width = pageSize === 'a4' ? 595.27 : 612;
      let height = pageSize === 'a4' ? 841.89 : 792;
      
      if (orientation === 'landscape') {
        const temp = width;
        width = height;
        height = temp;
      }

      // Margin in points
      let marginVal = 36; // normal (0.5 inch)
      if (margins === 'narrow') marginVal = 18;
      if (margins === 'wide') marginVal = 54;

      const activeSheet = sheets[selectedSheetIndex];
      const rows = activeSheet.rows;

      // Filter empty rows
      const filledRows = rows.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
      if (filledRows.length === 0) {
        alert('Active worksheet is empty.');
        setIsProcessing(false);
        return;
      }

      // Find max columns
      let maxCols = 0;
      filledRows.forEach(r => {
        if (r.length > maxCols) maxCols = r.length;
      });

      // Calculate grid column widths to fit print width
      const printWidth = width - (marginVal * 2);
      const colWidth = printWidth / Math.max(maxCols, 1);
      const rowHeight = 20;

      let currentPage = pdfDoc.addPage([width, height]);
      let currentY = height - marginVal;

      setProgress(50);
      setLoadingText('Formatting table layout...');

      for (let rIdx = 0; rIdx < filledRows.length; rIdx++) {
        // Check if we need a page break
        if (currentY - rowHeight < marginVal) {
          currentPage = pdfDoc.addPage([width, height]);
          currentY = height - marginVal;
        }

        const row = filledRows[rIdx];
        
        // Draw row cells
        for (let cIdx = 0; cIdx < maxCols; cIdx++) {
          const val = row[cIdx] !== undefined ? String(row[cIdx]) : '';
          const x = marginVal + (cIdx * colWidth);
          const y = currentY - rowHeight;

          // Draw cell borders
          if (showGridlines) {
            currentPage.drawRectangle({
              x,
              y,
              width: colWidth,
              height: rowHeight,
              borderColor: rgb(0.8, 0.8, 0.8),
              borderWidth: 0.5,
            });
          }

          // Truncate cell text if it overflows the cell width
          let cleanVal = val;
          const maxChar = Math.floor(colWidth / 5.5);
          if (cleanVal.length > maxChar && maxChar > 3) {
            cleanVal = cleanVal.substring(0, maxChar - 3) + '...';
          }

          if (cleanVal) {
            currentPage.drawText(cleanVal, {
              x: x + 4,
              y: y + 6,
              size: 8,
              font: rIdx === 0 ? fontBold : font,
              color: rgb(0.1, 0.1, 0.1),
            });
          }
        }

        currentY -= rowHeight;
        
        // Update progress occasionally
        if (rIdx % 10 === 0) {
          setProgress(Math.round(50 + (40 * rIdx) / filledRows.length));
        }
      }

      setProgress(90);
      setLoadingText('Saving PDF document...');
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSheet = sheets[selectedSheetIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="excel-to-pdf"
        title={t('tool.excelToPdf.title')}
        description={t('tool.excelToPdf.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {!file ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".xlsx,.xls,.csv"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload Excel or CSV spreadsheet"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap gap-3 justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250">
                  Preview: {file.name}
                </h3>
                {sheets.length > 1 && (
                  <select
                    value={selectedSheetIndex}
                    onChange={(e) => {
                      setSelectedSheetIndex(Number(e.target.value));
                      setPdfUrl(null);
                    }}
                    className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card rounded-lg font-semibold text-slate-800 dark:text-slate-200"
                  >
                    {sheets.map((sheet, index) => (
                      <option key={sheet.name} value={index}>
                        Sheet: {sheet.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <button
                onClick={() => {
                  setFile(null);
                  setSheets([]);
                  setPdfUrl(null);
                }}
                className="text-[10px] text-slate-450 hover:text-brand-500 font-bold hover:underline"
              >
                Upload Different File
              </button>
            </div>

            {isProcessing && (
              <div className="py-20 text-center">
                <ProgressBar progress={progress} statusText={loadingText} />
              </div>
            )}

            {!isProcessing && pdfUrl ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl border border-emerald-500/20 text-xs font-semibold">
                  <span>PDF generation complete! Check the preview or download.</span>
                  <a
                    href={pdfUrl}
                    download={file.name.replace(/\.[^/.]+$/, "") + ".pdf"}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download size={13} />
                    <span>Download PDF</span>
                  </a>
                </div>
                <iframe
                  src={pdfUrl}
                  title="PDF Preview"
                  className="w-full h-[550px] rounded-xl border border-slate-200 dark:border-slate-800"
                />
              </div>
            ) : (
              !isProcessing && activeSheet && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-350">
                    <span className="flex items-center gap-1.5">
                      <Eye size={14} className="text-brand-500" />
                      <span>Interactive Grid Preview (First 50 Rows)</span>
                    </span>
                    <span>Total Rows: {activeSheet.rows.length}</span>
                  </div>
                  
                  <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
                    <table className="w-full border-collapse text-[11px] text-slate-650 dark:text-slate-350">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-850/80 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                          <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center w-10 font-bold bg-slate-100 dark:bg-slate-850">#</th>
                          {Array.from({ length: Math.min(activeSheet.rows[0]?.length || 0, 20) }).map((_, cIdx) => (
                            <th key={cIdx} className="p-2 border-r border-slate-200 dark:border-slate-800 text-left font-bold uppercase tracking-wider">
                              Column {String.fromCharCode(65 + cIdx)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeSheet.rows.slice(0, 50).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 border-b border-slate-200 dark:border-slate-805">
                            <td className="p-2 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 text-center font-bold text-slate-400">
                              {rIdx + 1}
                            </td>
                            {Array.from({ length: Math.min(activeSheet.rows[0]?.length || 0, 20) }).map((_, cIdx) => (
                              <td key={cIdx} className={`p-2 border-r border-slate-200 dark:border-slate-800 truncate max-w-[150px] ${rIdx === 0 ? 'font-bold text-slate-800 dark:text-slate-200' : ''}`}>
                                {row[cIdx] !== undefined ? String(row[cIdx]) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Configuration Panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <Settings size={16} className="text-brand-500" />
                <span>PDF Format Settings</span>
              </h3>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                {/* Orientation */}
                <div className="space-y-1.5">
                  <label>Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setOrientation('portrait'); setPdfUrl(null); }}
                      className={`py-2 rounded-lg border text-center font-bold transition-all ${
                        orientation === 'portrait'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      onClick={() => { setOrientation('landscape'); setPdfUrl(null); }}
                      className={`py-2 rounded-lg border text-center font-bold transition-all ${
                        orientation === 'landscape'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                {/* Page Size */}
                <div className="space-y-1.5">
                  <label>Page Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setPageSize('a4'); setPdfUrl(null); }}
                      className={`py-2 rounded-lg border text-center font-bold transition-all ${
                        pageSize === 'a4'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      A4 Standard
                    </button>
                    <button
                      onClick={() => { setPageSize('letter'); setPdfUrl(null); }}
                      className={`py-2 rounded-lg border text-center font-bold transition-all ${
                        pageSize === 'letter'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      US Letter
                    </button>
                  </div>
                </div>

                {/* Margins */}
                <div className="space-y-1.5">
                  <label>Margins</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'narrow', label: 'Narrow (0.25")' },
                      { key: 'normal', label: 'Normal (0.5")' },
                      { key: 'wide', label: 'Wide (0.75")' }
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => { setMargins(m.key as any); setPdfUrl(null); }}
                        className={`py-2 rounded-lg border text-center text-[10px] font-bold transition-all ${
                          margins === m.key
                            ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gridlines toggler */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                  <span className="flex items-center gap-1.5">
                    <LayoutGrid size={14} className="text-slate-400" />
                    <span>Include Table Gridlines</span>
                  </span>
                  <button
                    onClick={() => { setShowGridlines(!showGridlines); setPdfUrl(null); }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-250 ${
                      showGridlines ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        showGridlines ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <button
                  onClick={generatePdf}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                >
                  <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                  <span>Convert Excel to PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelToPdf;
