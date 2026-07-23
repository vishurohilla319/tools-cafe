import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import { 
  Download, 
  FileSpreadsheet, 
  RefreshCw, 
  Eye, 
  EyeOff,
  HelpCircle, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Grid, 
  Sliders, 
  FileCode,
  Table as TableIcon,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Combine,
  Wand2,
  Columns
} from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ExtractedTable {
  pageNumber: number;
  rows: string[][];
}

type ExtractionMode = 'visual-ruler' | 'whitespace-gutter' | 'smart-grid' | 'gap-threshold';

export const PdfToExcel: React.FC = () => {
  const { t } = useLanguage();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  
  // Password Protection States
  const [isPasswordRequired, setIsPasswordRequired] = useState<boolean>(false);
  const [pdfPassword, setPdfPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  // Advanced Extraction Tuning Options
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('visual-ruler');
  const [columnThreshold, setColumnThreshold] = useState<number>(12); // Gutter / Gap width
  const [rowTolerance, setRowTolerance] = useState<number>(5); // Line Y tolerance
  const [mergeMultilineRows, setMergeMultilineRows] = useState<boolean>(true); // Merge sub-lines into same row
  const [autoParseNumbers, setAutoParseNumbers] = useState<boolean>(true);
  const [trimWhitespace, setTrimWhitespace] = useState<boolean>(true);
  const [removeEmptyRows, setRemoveEmptyRows] = useState<boolean>(true);
  const [hasHeaderRow, setHasHeaderRow] = useState<boolean>(true);
  const [exportSingleSheet, setExportSingleSheet] = useState<boolean>(true);

  // Interactive Visual Column Ruler lines (percentages 0 - 100%)
  const [columnRulers, setColumnRulers] = useState<number[]>([15, 45, 58, 68, 78, 88]);
  const [pageWidthPx, setPageWidthPx] = useState<number>(600);
  const rulerContainerRef = useRef<HTMLDivElement>(null);
  const activeRulerIdxRef = useRef<number | null>(null);

  // Status & Async States
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isScannedPdf, setIsScannedPdf] = useState(false);

  const resetState = () => {
    setPdfFile(null);
    setArrayBuffer(null);
    setTables([]);
    setTotalPages(0);
    setIsPasswordRequired(false);
    setPdfPassword('');
    setPasswordError('');
    setIsUnlocked(false);
    setIsScannedPdf(false);
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    setTables([]);
    setIsScannedPdf(false);
    setIsPasswordRequired(false);
    setPdfPassword('');
    setPasswordError('');
    setIsUnlocked(false);
    
    try {
      const buffer = await file.arrayBuffer();
      setArrayBuffer(buffer);
      await loadPdfDocument(buffer, '');
    } catch (err) {
      console.error("Failed to load PDF preview:", err);
    }
  };

  /**
   * Loads PDF Document with password handling
   */
  const loadPdfDocument = async (buffer: ArrayBuffer, pwd: string) => {
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        password: pwd
      });
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);
      setIsPasswordRequired(false);
      setPasswordError('');
      setIsUnlocked(true);

      // Auto inspect page 1 viewport width
      const page1 = await pdf.getPage(1);
      const vp = page1.getViewport({ scale: 1.0 });
      setPageWidthPx(vp.width || 600);

      return pdf;
    } catch (err: any) {
      if (
        err?.name === 'PasswordException' || 
        err?.code === 1 || 
        err?.code === 2 || 
        (err?.message && err.message.toLowerCase().includes('password'))
      ) {
        setIsPasswordRequired(true);
        if (pwd) {
          setPasswordError('Incorrect password. Please enter the correct password.');
        } else {
          setPasswordError('');
        }
        return null;
      }
      throw err;
    }
  };

  /**
   * Submit Password Handler
   */
  const handlePasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!arrayBuffer || !pdfPassword) return;

    setIsProcessing(true);
    setLoadingText('Verifying PDF password...');
    try {
      const pdf = await loadPdfDocument(arrayBuffer, pdfPassword);
      if (pdf) {
        await runTableExtraction(pdf);
      }
    } catch (err: any) {
      alert(`Error opening PDF: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Trigger table extraction manually or after unlock
   */
  const extractTables = async () => {
    if (!arrayBuffer || !pdfFile) return;

    setIsProcessing(true);
    setProgress(10);
    setLoadingText('Initializing Visual Column & Layout Engine...');
    setIsScannedPdf(false);

    try {
      const pdf = await loadPdfDocument(arrayBuffer, pdfPassword);
      if (pdf) {
        await runTableExtraction(pdf);
      }
    } catch (err: any) {
      console.error("PDF Extraction error:", err);
      alert(`Error parsing PDF: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Clean raw string from PDF ligatures and control characters
   */
  const cleanRawText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\uFB01/g, 'fi')
      .replace(/\uFB02/g, 'fl')
      .replace(/\s+/g, ' ');
  };

  /**
   * Interactive Column Ruler Drag & Add Handlers
   */
  const addColumnRulerAtPos = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerContainerRef.current) return;
    const rect = rulerContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.round((clickX / rect.width) * 100);
    if (pct > 2 && pct < 98 && !columnRulers.includes(pct)) {
      setColumnRulers([...columnRulers, pct].sort((a, b) => a - b));
    }
  };

  const removeColumnRuler = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (columnRulers.length <= 1) return;
    const updated = columnRulers.filter((_, i) => i !== idx);
    setColumnRulers(updated);
  };

  const startRulerDrag = (idx: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    activeRulerIdxRef.current = idx;

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (activeRulerIdxRef.current === null || !rulerContainerRef.current) return;
      const rect = rulerContainerRef.current.getBoundingClientRect();
      const clickX = moveEvt.clientX - rect.left;
      const pct = Math.max(2, Math.min(98, Math.round((clickX / rect.width) * 100)));

      setColumnRulers(prev => {
        const updated = [...prev];
        updated[activeRulerIdxRef.current!] = pct;
        return updated.sort((a, b) => a - b);
      });
    };

    const handlePointerUp = () => {
      activeRulerIdxRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  /**
   * Advanced Visual Column Ruler & Layout Extraction Engine
   */
  const runTableExtraction = async (pdf: pdfjsLib.PDFDocumentProxy) => {
    const numPages = pdf.numPages;
    const extractedPages: ExtractedTable[] = [];
    let totalTextItemsCount = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      setLoadingText(`Extracting columns on Page ${pageNum} of ${numPages}...`);
      setProgress(Math.round(10 + (75 * pageNum) / numPages));

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const currentWidth = viewport.width || pageWidthPx || 600;
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];
      totalTextItemsCount += items.length;

      if (items.length === 0) {
        extractedPages.push({
          pageNumber: pageNum,
          rows: [
            ['[Scanned Image / No Vector Text Detected]'],
            ['This page appears to contain scanned images instead of text elements.']
          ]
        });
        continue;
      }

      // Convert text items to normalized bounding box elements
      const rawItems = items.filter(it => it.str && (trimWhitespace ? it.str.trim().length > 0 : true)).map(it => {
        const x = it.transform[4];
        const y = it.transform[5];
        const width = Math.max(it.width || 0, 4);
        const height = Math.abs(it.transform[0] || it.transform[3] || 10);
        const cleanedStr = cleanRawText(it.str);
        const xPct = (x / currentWidth) * 100;
        const xMidPct = ((x + width / 2) / currentWidth) * 100;
        return {
          str: trimWhitespace ? cleanedStr.trim() : cleanedStr,
          x,
          y,
          width,
          height,
          xPct,
          xMidPct
        };
      });

      if (rawItems.length === 0) {
        extractedPages.push({
          pageNumber: pageNum,
          rows: [['No readable text content on this page']]
        });
        continue;
      }

      // Group items into Row Lines by Y coordinate (PDF Y decreases downwards)
      const rowMap: { [y: number]: typeof rawItems } = {};

      rawItems.forEach((item) => {
        const existingYKey = Object.keys(rowMap).find(rk => Math.abs(Number(rk) - item.y) <= rowTolerance);
        if (existingYKey !== undefined) {
          rowMap[Number(existingYKey)].push(item);
        } else {
          rowMap[item.y] = [item];
        }
      });

      // Sort row Y keys descending (top of page to bottom)
      const sortedYKeys = Object.keys(rowMap)
        .map(Number)
        .sort((a, b) => b - a);

      let pageRows: string[][] = [];

      if (extractionMode === 'visual-ruler') {
        // --- VISUAL COLUMN RULER ALGORITHM ---
        const sortedRulers = [...columnRulers].sort((a, b) => a - b);
        const numCols = sortedRulers.length + 1;

        sortedYKeys.forEach((yKey) => {
          const rowItems = rowMap[yKey];
          rowItems.sort((a, b) => a.x - b.x);

          const rowCells: string[] = new Array(numCols).fill('');

          rowItems.forEach(item => {
            // Find which column band the item's midpoint falls into
            let colIdx = 0;
            for (let r = 0; r < sortedRulers.length; r++) {
              if (item.xMidPct >= sortedRulers[r]) {
                colIdx = r + 1;
              } else {
                break;
              }
            }

            if (rowCells[colIdx]) {
              rowCells[colIdx] += ' ' + item.str;
            } else {
              rowCells[colIdx] = item.str;
            }
          });

          let processedCells = rowCells.map(c => trimWhitespace ? c.trim() : c);
          const isEmptyRow = processedCells.every(c => c === '');
          if (!isEmptyRow || !removeEmptyRows) {
            pageRows.push(processedCells);
          }
        });

      } else if (extractionMode === 'whitespace-gutter') {
        // --- WHITESPACE GUTTER ALGORITHM ---
        const pageWidthInt = Math.ceil(currentWidth || 1000);
        const coverage = new Uint16Array(pageWidthInt + 1);

        rawItems.forEach(item => {
          const start = Math.max(0, Math.floor(item.x));
          const end = Math.min(pageWidthInt, Math.ceil(item.x + item.width));
          for (let px = start; px <= end; px++) {
            coverage[px] += 1;
          }
        });

        interface ColumnInterval {
          start: number;
          end: number;
        }

        const columnIntervals: ColumnInterval[] = [];
        let inCol = false;
        let colStart = 0;
        const minGutter = Math.max(4, columnThreshold);

        let quietCount = 0;
        for (let px = 0; px <= pageWidthInt; px++) {
          const isOccupied = coverage[px] > 0;
          if (isOccupied) {
            if (!inCol) {
              inCol = true;
              colStart = px;
            }
            quietCount = 0;
          } else {
            quietCount++;
            if (inCol && quietCount >= minGutter) {
              inCol = false;
              columnIntervals.push({ start: colStart, end: px - quietCount });
            }
          }
        }
        if (inCol) {
          columnIntervals.push({ start: colStart, end: pageWidthInt });
        }

        if (columnIntervals.length === 0) {
          columnIntervals.push({ start: 0, end: pageWidthInt });
        }

        sortedYKeys.forEach((yKey) => {
          const rowItems = rowMap[yKey];
          rowItems.sort((a, b) => a.x - b.x);

          const rowCells: string[] = new Array(columnIntervals.length).fill('');

          rowItems.forEach(item => {
            let bestColIdx = 0;
            let maxOverlap = -1;

            columnIntervals.forEach((interval, cIdx) => {
              const overlapStart = Math.max(item.x, interval.start);
              const overlapEnd = Math.min(item.x + item.width, interval.end);
              const overlap = Math.max(0, overlapEnd - overlapStart);

              if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestColIdx = cIdx;
              }
            });

            if (rowCells[bestColIdx]) {
              rowCells[bestColIdx] += ' ' + item.str;
            } else {
              rowCells[bestColIdx] = item.str;
            }
          });

          let processedCells = rowCells.map(c => trimWhitespace ? c.trim() : c);
          const isEmptyRow = processedCells.every(c => c === '');
          if (!isEmptyRow || !removeEmptyRows) {
            pageRows.push(processedCells);
          }
        });

      } else if (extractionMode === 'smart-grid') {
        const xPositions = rawItems.map(i => i.x).sort((a, b) => a - b);
        const colBoundaries: number[] = [];

        xPositions.forEach(x => {
          if (colBoundaries.length === 0) {
            colBoundaries.push(x);
          } else {
            const lastBoundary = colBoundaries[colBoundaries.length - 1];
            if (x - lastBoundary > columnThreshold) {
              colBoundaries.push(x);
            }
          }
        });

        sortedYKeys.forEach((yKey) => {
          const rowItems = rowMap[yKey];
          rowItems.sort((a, b) => a.x - b.x);

          const rowCells: string[] = new Array(colBoundaries.length).fill('');

          rowItems.forEach(item => {
            let colIndex = 0;
            for (let c = colBoundaries.length - 1; c >= 0; c--) {
              if (item.x >= colBoundaries[c] - columnThreshold / 2) {
                colIndex = c;
                break;
              }
            }
            if (rowCells[colIndex]) {
              rowCells[colIndex] += ' ' + item.str;
            } else {
              rowCells[colIndex] = item.str;
            }
          });

          let processedCells = rowCells.map(c => trimWhitespace ? c.trim() : c);
          const isEmptyRow = processedCells.every(c => c === '');
          if (!isEmptyRow || !removeEmptyRows) {
            pageRows.push(processedCells);
          }
        });

      } else {
        sortedYKeys.forEach((yKey) => {
          const rowItems = rowMap[yKey];
          rowItems.sort((a, b) => a.x - b.x);

          const rowCells: string[] = [];
          let currentCell = '';
          let lastX = -1;
          let lastWidth = 0;

          rowItems.forEach(item => {
            if (lastX === -1) {
              currentCell = item.str;
            } else {
              const gap = item.x - (lastX + lastWidth);
              if (gap > columnThreshold) {
                rowCells.push(trimWhitespace ? currentCell.trim() : currentCell);
                currentCell = item.str;
              } else {
                currentCell += ' ' + item.str;
              }
            }
            lastX = item.x;
            lastWidth = item.width;
          });

          if (currentCell) {
            rowCells.push(trimWhitespace ? currentCell.trim() : currentCell);
          }

          if (rowCells.length > 0 && (!removeEmptyRows || rowCells.some(c => c !== ''))) {
            pageRows.push(rowCells);
          }
        });
      }

      // --- MULTI-LINE ROW MERGING POST-PROCESSOR ---
      if (mergeMultilineRows && pageRows.length > 1) {
        const mergedRows: string[][] = [];
        pageRows.forEach((r, idx) => {
          if (idx === 0) {
            mergedRows.push(r);
            return;
          }
          const prevRow = mergedRows[mergedRows.length - 1];
          const isContinuation = r.length === prevRow.length && r[0] === '' && r.some(c => c !== '');
          if (isContinuation) {
            r.forEach((cellVal, cIdx) => {
              if (cellVal) {
                prevRow[cIdx] = prevRow[cIdx] ? `${prevRow[cIdx]} ${cellVal}` : cellVal;
              }
            });
          } else {
            mergedRows.push(r);
          }
        });
        pageRows = mergedRows;
      }

      // Trim empty trailing columns
      if (pageRows.length > 0 && removeEmptyRows) {
        const maxCols = Math.max(...pageRows.map(r => r.length));
        const activeCols: boolean[] = new Array(maxCols).fill(false);

        pageRows.forEach(r => {
          r.forEach((cell, idx) => {
            if (cell !== '') activeCols[idx] = true;
          });
        });

        pageRows = pageRows.map(r => r.filter((_, idx) => activeCols[idx]));
      }

      extractedPages.push({
        pageNumber: pageNum,
        rows: pageRows.length > 0 ? pageRows : [['No data extracted on this page']]
      });
    }

    if (totalTextItemsCount === 0) {
      setIsScannedPdf(true);
    }

    setTables(extractedPages);
    setSelectedPageIndex(0);
    setProgress(100);
    setLoadingText('Table extraction complete!');
  };

  /**
   * Cell modification handlers for active preview table
   */
  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    const updated = [...tables];
    const activeRows = [...updated[selectedPageIndex].rows];
    activeRows[rIdx] = [...activeRows[rIdx]];
    activeRows[rIdx][cIdx] = val;
    updated[selectedPageIndex].rows = activeRows;
    setTables(updated);
  };

  const addRow = () => {
    if (tables.length === 0) return;
    const updated = [...tables];
    const activeTable = updated[selectedPageIndex];
    const colCount = activeTable.rows[0]?.length || 1;
    const newRow = new Array(colCount).fill('');
    activeTable.rows.push(newRow);
    setTables(updated);
  };

  const deleteRow = (rIdx: number) => {
    if (tables.length === 0) return;
    const updated = [...tables];
    const activeTable = updated[selectedPageIndex];
    if (activeTable.rows.length <= 1) return;
    activeTable.rows.splice(rIdx, 1);
    setTables(updated);
  };

  const addColumn = () => {
    if (tables.length === 0) return;
    const updated = [...tables];
    const activeTable = updated[selectedPageIndex];
    activeTable.rows.forEach(r => r.push(''));
    setTables(updated);
  };

  const deleteColumn = (cIdx: number) => {
    if (tables.length === 0) return;
    const updated = [...tables];
    const activeTable = updated[selectedPageIndex];
    if (activeTable.rows[0]?.length <= 1) return;
    activeTable.rows.forEach(r => r.splice(cIdx, 1));
    setTables(updated);
  };

  /**
   * Merge two adjacent columns into one
   */
  const mergeAdjacentColumns = (cIdx: number) => {
    if (tables.length === 0) return;
    const updated = [...tables];
    const activeTable = updated[selectedPageIndex];
    if (cIdx >= activeTable.rows[0]?.length - 1) return;

    activeTable.rows.forEach(r => {
      const col1 = r[cIdx] || '';
      const col2 = r[cIdx + 1] || '';
      r[cIdx] = (col1 + ' ' + col2).trim();
      r.splice(cIdx + 1, 1);
    });
    setTables(updated);
  };

  /**
   * Auto Clean Table Formatting (removes duplicate spaces, casts clean numbers)
   */
  const autoCleanTable = () => {
    if (tables.length === 0) return;
    const updated = [...tables];
    const activeTable = updated[selectedPageIndex];
    activeTable.rows = activeTable.rows.map(r => r.map(c => c.replace(/\s+/g, ' ').trim()));
    setTables(updated);
  };

  /**
   * Export to Excel Workbook (.xlsx) with true typed Numeric cells
   */
  const downloadExcel = () => {
    if (tables.length === 0) return;
    
    const wb = XLSX.utils.book_new();

    const processRowsForSheet = (rawRows: string[][]) => {
      return rawRows.map((row) => {
        return row.map((cell) => {
          if (!cell) return '';
          if (autoParseNumbers) {
            const unformatted = cell.replace(/[$₹€,]/g, '').trim();
            if (unformatted !== '' && !isNaN(Number(unformatted)) && !isNaN(parseFloat(unformatted))) {
              return Number(unformatted);
            }
          }
          return cell;
        });
      });
    };

    if (exportSingleSheet) {
      const allRows: string[][] = [];
      tables.forEach((t, idx) => {
        if (idx > 0 && hasHeaderRow && t.rows.length > 0) {
          allRows.push(...t.rows.slice(1));
        } else {
          allRows.push(...t.rows);
        }
      });

      const typedRows = processRowsForSheet(allRows);
      const ws = XLSX.utils.aoa_to_sheet(typedRows);

      const maxCols = Math.max(...allRows.map(r => r.length));
      ws['!cols'] = Array.from({ length: maxCols }, (_, colIdx) => {
        let maxLen = 10;
        allRows.forEach(r => {
          const val = String(r[colIdx] || '');
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.min(maxLen + 3, 50) };
      });

      XLSX.utils.book_append_sheet(wb, ws, "Extracted Data");
    } else {
      tables.forEach((t) => {
        const typedRows = processRowsForSheet(t.rows);
        const ws = XLSX.utils.aoa_to_sheet(typedRows);
        const maxCols = Math.max(...t.rows.map(r => r.length));
        ws['!cols'] = Array.from({ length: maxCols }, (_, colIdx) => {
          let maxLen = 10;
          t.rows.forEach(r => {
            const val = String(r[colIdx] || '');
            if (val.length > maxLen) maxLen = val.length;
          });
          return { wch: Math.min(maxLen + 3, 50) };
        });

        XLSX.utils.book_append_sheet(wb, ws, `Page ${t.pageNumber}`);
      });
    }

    const filename = `${pdfFile?.name.replace(/\.[^/.]+$/, "")}_converted.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  /**
   * Export to CSV (.csv)
   */
  const downloadCsv = () => {
    if (tables.length === 0) return;
    const activeTable = tables[selectedPageIndex];
    
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

  /**
   * Export to JSON (.json)
   */
  const downloadJson = () => {
    if (tables.length === 0) return;
    const activeTable = tables[selectedPageIndex];
    const rows = activeTable.rows;

    let jsonData: any[] = [];
    if (hasHeaderRow && rows.length > 1) {
      const headers = rows[0].map((h, i) => h.trim() || `Column_${i + 1}`);
      jsonData = rows.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((h, i) => {
          const val = row[i] || '';
          const num = val.replace(/[$₹€,]/g, '').trim();
          if (autoParseNumbers && num !== '' && !isNaN(Number(num))) {
            obj[h] = Number(num);
          } else {
            obj[h] = val;
          }
        });
        return obj;
      });
    } else {
      jsonData = rows;
    }

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${pdfFile?.name.replace(/\.[^/.]+$/, "")}_page_${activeTable.pageNumber}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Copy active table data to clipboard
   */
  const copyToClipboard = () => {
    if (tables.length === 0) return;
    const activeTable = tables[selectedPageIndex];
    const tsvText = activeTable.rows.map(r => r.join('\t')).join('\n');
    navigator.clipboard.writeText(tsvText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div className="max-w-2xl mx-auto mt-10">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload PDF document to extract tables into Excel"
          />

          {/* Feature Badges */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card text-center">
              <Columns className="w-6 h-6 text-brand-500 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Interactive Column Rulers</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Drag vertical lines to split bank statement columns with 100% precision
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card text-center">
              <TableIcon className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Interactive Editor & Formatter</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Edit cells, merge/split columns & cast true Excel numbers
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card text-center">
              <Lock className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Password & Multi-line Support</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Unlocks encrypted PDFs and combines multi-line table rows
              </p>
            </div>
          </div>
        </div>
      ) : isPasswordRequired ? (
        /* Password Prompt Dialog Card */
        <div className="max-w-md mx-auto mt-10 p-8 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-dark-card shadow-xl text-center space-y-5 animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h3 className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100">
              Password Protected PDF
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              "<span className="font-semibold text-slate-700 dark:text-slate-300">{pdfFile.name}</span>" is encrypted with a password. Please enter the password to proceed.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key size={14} className="text-amber-500" />
                <span>Enter Password</span>
              </label>
              
              <div className="relative">
                <input
                  type={showPasswordText ? "text" : "password"}
                  value={pdfPassword}
                  onChange={(e) => {
                    setPdfPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Enter PDF password..."
                  required
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordError && (
                <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={resetState}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isProcessing || !pdfPassword}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
              >
                {isProcessing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Unlock size={14} />
                )}
                <span>Unlock PDF</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          
          {/* Left / Main Workspace: Grid Preview & Editor */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Top Bar Info & Page Navigation */}
            <div className="flex flex-wrap gap-3 justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>{pdfFile.name}</span>
                    {isUnlocked && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Unlock size={10} /> Unlocked
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Total Pages: {totalPages} | Size: {(pdfFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              {tables.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">View Page:</span>
                  <select
                    value={selectedPageIndex}
                    onChange={(e) => setSelectedPageIndex(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                  >
                    {tables.map((table, index) => (
                      <option key={index} value={index}>
                        Page {table.pageNumber} ({table.rows.length} rows)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={resetState}
                className="text-xs text-slate-400 hover:text-brand-500 font-bold underline transition-colors"
              >
                Change PDF
              </button>
            </div>

            {/* Interactive Visual Column Ruler Bar */}
            {extractionMode === 'visual-ruler' && (
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-brand-400">
                    <Columns size={14} />
                    <span>Interactive Column Divider Ruler</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Click anywhere on the ruler bar to ADD a column line. Drag lines to move.
                  </span>
                </div>

                {/* Ruler Track Bar */}
                <div 
                  ref={rulerContainerRef}
                  onClick={addColumnRulerAtPos}
                  className="h-12 w-full bg-slate-800/80 rounded-xl relative overflow-hidden cursor-crosshair border border-slate-700 select-none"
                  title="Click to add vertical column line"
                >
                  {/* Ruler Ticks */}
                  <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20 px-2 text-[9px] font-mono">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>

                  {/* Vertical Column Divider Lines */}
                  {columnRulers.map((pct, idx) => (
                    <div
                      key={idx}
                      style={{ left: `${pct}%` }}
                      onPointerDown={(e) => startRulerDrag(idx, e)}
                      className="absolute top-0 bottom-0 w-4 -ml-2 flex flex-col items-center justify-between cursor-ew-resize group z-30 pointer-events-auto"
                      title={`Column Line ${idx + 1} (${pct}%). Drag to move or click X to remove.`}
                    >
                      <div className="w-3 h-3 bg-brand-500 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white shadow">
                        {idx + 1}
                      </div>
                      <div className="w-0.5 flex-1 bg-brand-400 group-hover:bg-amber-400 transition-colors" />
                      <button
                        onClick={(e) => removeColumnRuler(idx, e)}
                        className="w-3 h-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow"
                        title="Remove Line"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-300 font-semibold pt-1">
                  <span>Columns Detected: <strong className="text-amber-400">{columnRulers.length + 1} Columns</strong></span>
                  <button
                    onClick={extractTables}
                    className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all"
                  >
                    <RefreshCw size={12} />
                    <span>Apply Ruler & Re-Analyze</span>
                  </button>
                </div>
              </div>
            )}

            {/* Scanned PDF Warning Banner */}
            {isScannedPdf && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Scanned Document Detected</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    This PDF appears to be a scanned image or photo rather than structured vector text. You can manually enter data or add rows/columns in the editor below.
                  </p>
                </div>
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="py-20 text-center bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <ProgressBar progress={progress} statusText={loadingText} />
              </div>
            )}

            {/* Render Table Preview Grid */}
            {!isProcessing && tables.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm overflow-hidden">
                
                {/* Table Action Bar */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center text-xs gap-3">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                    <Eye size={16} className="text-brand-500" />
                    <span>Page {activeTable.pageNumber} Preview & Editor</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                      {activeTable.rows.length} Rows × {activeTable.rows[0]?.length || 0} Columns
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={autoCleanTable}
                      title="Auto clean extra spaces & formatting"
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 hover:bg-brand-50 font-semibold flex items-center gap-1 transition-colors text-[11px]"
                    >
                      <Wand2 size={12} />
                      <span>Auto Clean</span>
                    </button>

                    <button
                      onClick={addRow}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold flex items-center gap-1 transition-colors text-[11px]"
                    >
                      <Plus size={12} />
                      <span>Add Row</span>
                    </button>

                    <button
                      onClick={addColumn}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold flex items-center gap-1 transition-colors text-[11px]"
                    >
                      <Plus size={12} />
                      <span>Add Column</span>
                    </button>

                    <button
                      onClick={copyToClipboard}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 transition-colors text-[11px]"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copied ? 'Copied!' : 'Copy TSV'}</span>
                    </button>
                  </div>
                </div>

                {/* Editable Data Table */}
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        <th className="p-2 border-r border-slate-200 dark:border-slate-800 w-10 text-center">#</th>
                        {activeTable.rows[0]?.map((_, cIdx) => (
                          <th key={cIdx} className="p-2 border-r border-slate-200 dark:border-slate-800 min-w-[110px] text-left group relative">
                            <div className="flex justify-between items-center">
                              <span>Col {String.fromCharCode(65 + cIdx)}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {cIdx < activeTable.rows[0].length - 1 && (
                                  <button
                                    onClick={() => mergeAdjacentColumns(cIdx)}
                                    title="Merge with Next Column"
                                    className="text-brand-500 hover:text-brand-700 p-0.5"
                                  >
                                    <Combine size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteColumn(cIdx)}
                                  title="Delete Column"
                                  className="text-rose-500 hover:text-rose-700 p-0.5"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeTable.rows.map((row, rIdx) => {
                        const isHeader = hasHeaderRow && rIdx === 0;
                        return (
                          <tr 
                            key={rIdx} 
                            className={`group ${isHeader ? 'bg-amber-500/10 font-bold text-amber-900 dark:text-amber-300' : 'hover:bg-slate-50/80 dark:hover:bg-slate-850/40 text-slate-700 dark:text-slate-300'}`}
                          >
                            <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[10px] text-slate-400 relative">
                              {rIdx + 1}
                              <button
                                onClick={() => deleteRow(rIdx)}
                                title="Delete Row"
                                className="absolute left-1 top-1.5 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-opacity"
                              >
                                <Trash2 size={10} />
                              </button>
                            </td>
                            {row.map((cell, cIdx) => (
                              <td 
                                key={cIdx} 
                                className="p-1 border-r border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-brand-500"
                              >
                                <input
                                  type="text"
                                  value={cell}
                                  onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                  className="w-full px-1.5 py-1 bg-transparent border-none outline-none text-xs"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer info */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
                  <span>💡 Tip: Double click or click any cell to edit. Hover column headers to merge adjacent columns.</span>
                  {hasHeaderRow && <span className="text-amber-600 dark:text-amber-400 font-semibold">Row 1 marked as Header</span>}
                </div>
              </div>
            ) : (
              !isProcessing && (
                <div className="py-24 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-card">
                  <Grid className="w-14 h-14 text-brand-400 mx-auto mb-4 animate-pulse" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Ready to Extract Tables</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Click "Analyze & Extract Tables" to run our visual column divider engine.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Right Sidebar: Controls & Export Options */}
          <div className="space-y-6">
            
            {/* Control Settings Panel */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <Sliders size={16} className="text-brand-500" />
                <span>Extraction Engine Settings</span>
              </h3>

              <div className="space-y-5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                
                {/* Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400">Column Detection Engine</label>
                  <select
                    value={extractionMode}
                    onChange={(e) => setExtractionMode(e.target.value as ExtractionMode)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold text-xs text-brand-600 dark:text-brand-400"
                  >
                    <option value="visual-ruler">Interactive Visual Rulers (Recommended for Bank Statements)</option>
                    <option value="whitespace-gutter">Whitespace Gutters (Auto Column Gaps)</option>
                    <option value="smart-grid">Smart Grid Clustering (Standard Tables)</option>
                    <option value="gap-threshold">Proximity Gap Threshold</option>
                  </select>
                </div>

                {/* Column Threshold Slider */}
                {extractionMode !== 'visual-ruler' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label>Column Gap Threshold</label>
                      <span className="text-[10px] text-brand-600 bg-brand-500/10 px-2 py-0.5 rounded-md font-bold">
                        {columnThreshold} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="50"
                      value={columnThreshold}
                      onChange={(e) => setColumnThreshold(Number(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                  </div>
                )}

                {/* Row Tolerance Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label>Row Line Height Tolerance</label>
                    <span className="text-[10px] text-brand-600 bg-brand-500/10 px-2 py-0.5 rounded-md font-bold">
                      {rowTolerance} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="15"
                    value={rowTolerance}
                    onChange={(e) => setRowTolerance(Number(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mergeMultilineRows}
                      onChange={(e) => setMergeMultilineRows(e.target.checked)}
                      className="rounded text-brand-500 focus:ring-brand-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <Combine size={14} className="text-brand-500" />
                      <span>Merge Multi-line Cell Rows</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasHeaderRow}
                      onChange={(e) => setHasHeaderRow(e.target.checked)}
                      className="rounded text-brand-500 focus:ring-brand-500"
                    />
                    <span>First Row is Table Header</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trimWhitespace}
                      onChange={(e) => setTrimWhitespace(e.target.checked)}
                      className="rounded text-brand-500 focus:ring-brand-500"
                    />
                    <span>Trim Cell Whitespace</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={removeEmptyRows}
                      onChange={(e) => setRemoveEmptyRows(e.target.checked)}
                      className="rounded text-brand-500 focus:ring-brand-500"
                    />
                    <span>Remove Blank Rows & Columns</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoParseNumbers}
                      onChange={(e) => setAutoParseNumbers(e.target.checked)}
                      className="rounded text-brand-500 focus:ring-brand-500"
                    />
                    <span>Auto Format True Excel Numbers & Currency</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSingleSheet}
                      onChange={(e) => setExportSingleSheet(e.target.checked)}
                      className="rounded text-brand-500 focus:ring-brand-500"
                    />
                    <span>Combine Multi-Page PDF into 1 Sheet</span>
                  </label>
                </div>

                {/* Action Button: Extract */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={extractTables}
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.02]"
                  >
                    <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
                    <span>{tables.length > 0 ? 'Re-Analyze Table' : 'Analyze & Extract Tables'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Export Section (Shown once tables extracted) */}
            {tables.length > 0 && (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-3">
                <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Download size={16} className="text-emerald-500" />
                  <span>Download Converted File</span>
                </h4>

                <button
                  onClick={downloadExcel}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] text-xs"
                >
                  <Download size={16} />
                  <span>Export Excel Workbook (.xlsx)</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={downloadCsv}
                    className="py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs"
                  >
                    <Download size={14} />
                    <span>CSV (.csv)</span>
                  </button>

                  <button
                    onClick={downloadJson}
                    className="py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs"
                  >
                    <FileCode size={14} />
                    <span>JSON (.json)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Help / Privacy Note */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed flex gap-2.5">
              <HelpCircle className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-0.5">100% Client-Side Privacy</p>
                Your PDF document is analyzed directly in your web browser. No files are uploaded to remote servers or third-party storage.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default PdfToExcel;
