import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, RefreshCw, Eye, Settings, HelpCircle } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ExtractedTable {
  pageNumber: number;
  rows: string[][];
}

export const PdfToExcel: React.FC = () => {
  const { t } = useLanguage();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  
  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [columnThreshold, setColumnThreshold] = useState<number>(15); // Horizontal space to determine column gap


  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    setTables([]);
    
    const buffer = await file.arrayBuffer();
    setArrayBuffer(buffer);
  };
  const extractTables = async () => {
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
        formData.append('output_format', 'xlsx');

        setProgress(40);
        setLoadingText('Sending file to Supabase Edge Function (converting to editable Excel)...');

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

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const result = await response.json();
          if (result.sheets && result.sheets.length > 0) {
            const parsedTables = result.sheets.map((sheet: any, idx: number) => ({
              pageNumber: idx + 1,
              rows: sheet.rows || []
            }));
            setTables(parsedTables);
            setSelectedPageIndex(0);
            setProgress(100);
            setIsProcessing(false);
            return;
          }
        }

        setProgress(85);
        setLoadingText('Downloading Excel Workbook...');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${pdfFile.name.replace(/\.[^/.]+$/, "")}_converted.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setProgress(100);
        setIsProcessing(false);
        return;

      } catch (err: any) {
        console.warn('Supabase native conversion failed, falling back to local table extraction:', err);
      }
    }
    setLoadingText('Loading PDF layout (local fallback)...');
    setProgress(20);
    setTables([]);

    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const extracted: ExtractedTable[] = [];

      for (let i = 1; i <= numPages; i++) {
        setLoadingText(`Parsing page ${i} of ${numPages}...`);
        setProgress(Math.round(10 + (80 * i) / numPages));

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];

        if (items.length === 0) {
          extracted.push({ pageNumber: i, rows: [['Page is empty or contains only scanned images']] });
          continue;
        }

        // Group text items by y coordinate (with custom tolerance)
        const tolerance = 6; // Points tolerance for same row
        const rowMap: { [y: number]: any[] } = {};

        items.forEach((item) => {
          if (!item.str.trim()) return; // skip empty text items
          const y = item.transform[5];
          
          // Find if there is a row key within tolerance
          let foundRowY = Object.keys(rowMap).find((rk) => Math.abs(Number(rk) - y) < tolerance);
          
          if (foundRowY) {
            rowMap[Number(foundRowY)].push(item);
          } else {
            rowMap[y] = [item];
          }
        });

        // Sort row Y coordinates from top to bottom (descending)
        const sortedYKeys = Object.keys(rowMap)
          .map(Number)
          .sort((a, b) => b - a);

        const pageRows: string[][] = [];

        sortedYKeys.forEach((yKey) => {
          const rowItems = rowMap[yKey];
          // Sort items in the row from left to right (x coordinate ascending)
          rowItems.sort((a, b) => a.transform[4] - b.transform[4]);

          const rowCells: string[] = [];
          let currentCellText = '';
          let lastX = -1;
          let lastWidth = 0;

          rowItems.forEach((item) => {
            const x = item.transform[4];
            const width = item.width || 0;

            if (lastX === -1) {
              currentCellText = item.str;
            } else {
              const gap = x - (lastX + lastWidth);
              if (gap > columnThreshold) {
                // Large gap indicates new column cell
                rowCells.push(currentCellText.trim());
                currentCellText = item.str;
              } else {
                // Small gap, append text
                currentCellText += ' ' + item.str;
              }
            }

            lastX = x;
            lastWidth = width;
          });

          if (currentCellText) {
            rowCells.push(currentCellText.trim());
          }

          if (rowCells.length > 0) {
            pageRows.push(rowCells);
          }
        });

        extracted.push({
          pageNumber: i,
          rows: pageRows.length > 0 ? pageRows : [['No text elements detected']]
        });
      }

      setTables(extracted);
      setSelectedPageIndex(0);
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error parsing PDF. Make sure it is a vector text PDF and not scanned images.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = () => {
    if (tables.length === 0) return;
    
    // Create new workbook
    const wb = XLSX.utils.book_new();

    tables.forEach((t) => {
      // Convert sheet rows
      const ws = XLSX.utils.aoa_to_sheet(t.rows);
      XLSX.utils.book_append_sheet(wb, ws, `Page ${t.pageNumber}`);
    });

    // Write file
    XLSX.writeFile(wb, `${pdfFile?.name.replace(/\.[^/.]+$/, "")}_extracted.xlsx`);
  };

  const downloadCsv = () => {
    if (tables.length === 0) return;
    const activeTable = tables[selectedPageIndex];
    
    // Generate CSV content
    const ws = XLSX.utils.aoa_to_sheet(activeTable.rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${pdfFile?.name.replace(/\.[^/.]+$/, "")}_page_${activeTable.pageNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeTable = tables[selectedPageIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="pdf-to-excel"
        title={t('tool.pdfToExcel.title')}
        description={t('tool.pdfToExcel.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {!pdfFile ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload PDF document to extract tables"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap gap-3 justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250">
                  File: {pdfFile.name}
                </h3>
                {tables.length > 1 && (
                  <select
                    value={selectedPageIndex}
                    onChange={(e) => setSelectedPageIndex(Number(e.target.value))}
                    className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card rounded-lg font-semibold text-slate-850 dark:text-slate-200"
                  >
                    {tables.map((table, index) => (
                      <option key={index} value={index}>
                        Page {table.pageNumber}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <button
                onClick={() => {
                  setPdfFile(null);
                  setArrayBuffer(null);
                  setTables([]);
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

            {!isProcessing && tables.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-650 dark:text-slate-350">
                  <span className="flex items-center gap-1.5">
                    <Eye size={14} className="text-brand-500" />
                    <span>Extracted Table Preview</span>
                  </span>
                  <span>Total Rows: {activeTable.rows.length}</span>
                </div>

                <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
                  <table className="w-full border-collapse text-[11px] text-slate-600 dark:text-slate-300">
                    <tbody>
                      {activeTable.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 border-b border-slate-100 dark:border-slate-800">
                          <td className="p-2 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center w-10 font-bold text-slate-400">
                            {rIdx + 1}
                          </td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 border-r border-slate-200 dark:border-slate-800 min-w-[80px]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              !isProcessing && (
                <div className="py-24 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-card/50">
                  <FileSpreadsheet className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-250">Table Analysis Pending</h4>
                  <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Hit "Analyze & Extract Tables" below to parse columns and grids from your PDF file.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Action & Configuration Panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <Settings size={16} className="text-brand-500" />
                <span>Conversion Settings</span>
              </h3>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 justify-between">
                    <label>Column Detection Gap</label>
                    <span className="text-[10px] text-brand-600 bg-brand-500/10 px-1.5 py-0.5 rounded font-bold">
                      {columnThreshold}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={columnThreshold}
                    disabled={tables.length > 0}
                    onChange={(e) => setColumnThreshold(Number(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                  <span className="text-[9px] text-slate-400 block leading-tight">
                    Smaller gaps detect more columns. Re-analyze if grids are misaligned.
                  </span>
                </div>


                
                {tables.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={downloadExcel}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 transition-all hover:scale-[1.02]"
                    >
                      <Download size={14} />
                      <span>Export Workbook (.xlsx)</span>
                    </button>
                    
                    <button
                      onClick={downloadCsv}
                      className="w-full py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download size={14} />
                      <span>Export Page {activeTable.pageNumber} (.csv)</span>
                    </button>
                  </div>
                )}
              </div>

              {tables.length === 0 && (
                <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <button
                    onClick={extractTables}
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                  >
                    <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                    <span>Analyze & Extract Tables</span>
                  </button>
                </div>
              )}

              {tables.length > 0 && (
                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5">
                  <button
                    onClick={() => setTables([])}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Reset Extraction</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold leading-relaxed flex gap-2">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-500 dark:text-slate-350 font-bold mb-1">OCR Note</p>
                This tool reads text PDF data structures. Scanned pages or photo-only files require image-to-text OCR which is not processed by offline client-side extraction.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfToExcel;
