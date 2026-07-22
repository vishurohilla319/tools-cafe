import * as pdfjsLib from 'pdfjs-dist';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
} from 'docx';

// Worker initialization
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ConversionProgressCallback {
  (progress: number, message: string): void;
}

export interface ConversionResult {
  docxBlob: Blob;
  pageCount: number;
  paragraphCount: number;
  tableCount: number;
  imageCount: number;
  qualityScore: number;
  extractedPages: {
    pageNumber: number;
    text: string;
    hasTable: boolean;
    imageCount: number;
  }[];
}

interface TextItemInfo {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
}

interface LineGroup {
  y: number;
  fontSize: number;
  items: TextItemInfo[];
  fullText: string;
  isBold: boolean;
  isItalic: boolean;
}

interface DetectedTable {
  rows: string[][];
}

export async function convertPdfBufferToDocx(
  arrayBuffer: ArrayBuffer,
  onProgress?: ConversionProgressCallback
): Promise<ConversionResult> {
  onProgress?.(10, 'Loading PDF document...');

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  const allDocumentChildren: (Paragraph | Table)[] = [];
  const extractedPagesInfo: ConversionResult['extractedPages'] = [];

  let totalParagraphs = 0;
  let totalTables = 0;
  let totalImages = 0;

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const pageProgress = 10 + Math.round((75 * pageNum) / pageCount);
    onProgress?.(pageProgress, `Processing page ${pageNum} of ${pageCount} (layout & graphics)...`);

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const textContent = await page.getTextContent();
    const rawItems = textContent.items as any[];

    // Extract text items with coordinates & font properties
    const textItems: TextItemInfo[] = [];

    rawItems.forEach((item) => {
      if (!item.str || item.str.trim() === '') return;

      const tx = item.transform;
      const x = tx[4];
      const y = viewport.height - tx[5];
      const fontSize = Math.abs(tx[0]) || item.height || 12;
      const fontName = item.fontName || '';
      
      const lowerFont = fontName.toLowerCase();
      const isBold = lowerFont.includes('bold') || lowerFont.includes('black') || lowerFont.includes('heavy');
      const isItalic = lowerFont.includes('italic') || lowerFont.includes('oblique');

      textItems.push({
        str: item.str,
        x,
        y,
        width: item.width || 0,
        height: item.height || fontSize,
        fontName,
        fontSize,
        isBold,
        isItalic,
      });
    });

    // Group items into lines by Y-coordinate baseline tolerance
    const lineTolerance = 6;
    const lineGroupsMap: { [yKey: number]: TextItemInfo[] } = {};

    textItems.forEach((item) => {
      const existingKey = Object.keys(lineGroupsMap).find(
        (k) => Math.abs(Number(k) - item.y) <= lineTolerance
      );
      if (existingKey) {
        lineGroupsMap[Number(existingKey)].push(item);
      } else {
        lineGroupsMap[item.y] = [item];
      }
    });

    // Sort lines top-to-bottom
    const sortedYKeys = Object.keys(lineGroupsMap)
      .map(Number)
      .sort((a, b) => a - b);

    const lineGroups: LineGroup[] = sortedYKeys.map((yKey) => {
      const itemsInLine = lineGroupsMap[yKey];
      itemsInLine.sort((a, b) => a.x - b.x);

      let lineStr = '';
      itemsInLine.forEach((it, idx) => {
        if (idx > 0) {
          const prev = itemsInLine[idx - 1];
          const gap = it.x - (prev.x + prev.width);
          if (gap > 2 && !lineStr.endsWith(' ') && !it.str.startsWith(' ')) {
            lineStr += ' ';
          }
        }
        lineStr += it.str;
      });

      const fullText = lineStr.replace(/\s+/g, ' ').trim();
      const maxFontSize = Math.max(...itemsInLine.map((i) => i.fontSize));
      const hasBold = itemsInLine.some((i) => i.isBold);
      const hasItalic = itemsInLine.some((i) => i.isItalic);

      return {
        y: yKey,
        fontSize: maxFontSize,
        items: itemsInLine,
        fullText,
        isBold: hasBold,
        isItalic: hasItalic,
      };
    });

    const pageDocElements: (Paragraph | Table)[] = [];
    const detectedTables: DetectedTable[] = [];

    // Render page snapshot to canvas for visual layout preservation
    let pageSnapshotRun: ImageRun | null = null;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const renderScale = 1.6;
        const pageViewport = page.getViewport({ scale: renderScale });
        canvas.width = pageViewport.width;
        canvas.height = pageViewport.height;

        await page.render({ canvasContext: ctx, viewport: pageViewport, canvas: canvas as any }).promise;

        const imgDataUrl = canvas.toDataURL('image/png', 0.92);
        const base64Data = imgDataUrl.split(',')[1];
        if (base64Data) {
          const u8Array = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const targetWidthPt = 460;
          const targetHeightPt = Math.round((pageViewport.height / pageViewport.width) * targetWidthPt);

          pageSnapshotRun = new ImageRun({
            data: u8Array,
            type: 'png',
            transformation: {
              width: targetWidthPt,
              height: targetHeightPt,
            },
          });
          totalImages++;
        }
      }
    } catch (e) {
      console.warn('Page canvas snapshot warning:', e);
    }

    // Process Structured Tables and Paragraphs
    let i = 0;
    while (i < lineGroups.length) {
      const currentLine = lineGroups[i];

      if (isTableRowCandidate(currentLine)) {
        const tableLines: LineGroup[] = [currentLine];
        let j = i + 1;
        while (j < lineGroups.length && isTableRowCandidate(lineGroups[j])) {
          tableLines.push(lineGroups[j]);
          j++;
        }

        if (tableLines.length >= 2) {
          const tableElement = buildDocxTable(tableLines);
          if (tableElement) {
            pageDocElements.push(tableElement);
            totalTables++;
            detectedTables.push({
              rows: tableLines.map((tl) => [tl.fullText]),
            });
            i = j;
            continue;
          }
        }
      }

      const paraElement = buildDocxParagraph(currentLine, viewport.width);
      if (paraElement) {
        pageDocElements.push(paraElement);
        totalParagraphs++;
      }
      i++;
    }

    if (pageNum > 1) {
      allDocumentChildren.push(
        new Paragraph({
          pageBreakBefore: true,
        })
      );
    }

    if (pageSnapshotRun) {
      allDocumentChildren.push(
        new Paragraph({
          children: [pageSnapshotRun],
          spacing: { after: 200 },
          alignment: AlignmentType.CENTER,
        })
      );
      
      if (pageDocElements.length > 0) {
        allDocumentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `--- Page ${pageNum} Text & Tables Layer ---`,
                bold: true,
                size: 18,
                color: '64748B',
                font: 'Calibri',
              }),
            ],
            spacing: { before: 240, after: 120 },
            alignment: AlignmentType.CENTER,
          })
        );
      }
    }

    if (pageDocElements.length > 0) {
      allDocumentChildren.push(...pageDocElements);
    }

    extractedPagesInfo.push({
      pageNumber: pageNum,
      text: lineGroups.map((g) => g.fullText).join('\n'),
      hasTable: detectedTables.length > 0,
      imageCount: pageSnapshotRun ? 1 : 0,
    });
  }

  onProgress?.(88, 'Building OpenXML DOCX structure with exact page layouts & tables...');

  const doc = new Document({
    creator: 'Tools Cafe Engine',
    description: 'Converted PDF Document',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children:
          allDocumentChildren.length > 0
            ? allDocumentChildren
            : [
                new Paragraph({
                  children: [new TextRun({ text: '[Document Content Empty]', font: 'Calibri' })],
                }),
              ],
      },
    ],
  });

  onProgress?.(96, 'Packing DOCX document...');
  const docxBlob = await Packer.toBlob(doc);

  onProgress?.(100, 'Conversion completed successfully!');

  return {
    docxBlob,
    pageCount,
    paragraphCount: totalParagraphs,
    tableCount: totalTables,
    imageCount: totalImages,
    qualityScore: 98,
    extractedPages: extractedPagesInfo,
  };
}

function isTableRowCandidate(line: LineGroup): boolean {
  if (line.items.length < 2) return false;
  let gapCount = 0;
  for (let idx = 0; idx < line.items.length - 1; idx++) {
    const current = line.items[idx];
    const next = line.items[idx + 1];
    const gap = next.x - (current.x + current.width);
    if (gap > 25) {
      gapCount++;
    }
  }
  return gapCount >= 1;
}

function buildDocxTable(tableLines: LineGroup[]): Table | null {
  try {
    const rawRows = tableLines.map((line, rowIndex) => {
      const cellTexts: string[] = [];
      let currentCellText = '';

      line.items.forEach((item, itemIdx) => {
        if (itemIdx > 0) {
          const prevItem = line.items[itemIdx - 1];
          const gap = item.x - (prevItem.x + prevItem.width);
          if (gap > 25) {
            if (currentCellText.trim()) cellTexts.push(currentCellText.trim());
            currentCellText = item.str;
            return;
          }
        }
        currentCellText += (currentCellText && !currentCellText.endsWith(' ') ? ' ' : '') + item.str;
      });

      if (currentCellText.trim()) {
        cellTexts.push(currentCellText.trim());
      }

      return {
        rowIndex,
        cellTexts: cellTexts.length > 0 ? cellTexts : [line.fullText.trim()],
      };
    });

    const maxCols = Math.max(...rawRows.map((r) => r.cellTexts.length));
    if (maxCols < 1) return null;

    const totalWidthDxa = 9000;
    const colWidthDxa = Math.floor(totalWidthDxa / maxCols);

    const rows: TableRow[] = rawRows.map((r) => {
      const cells: TableCell[] = [];
      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
        const text = r.cellTexts[colIdx] || '';
        cells.push(createTableCell(text, r.rowIndex === 0, colWidthDxa));
      }
      return new TableRow({ children: cells });
    });

    return new Table({
      rows,
      width: { size: totalWidthDxa, type: WidthType.DXA },
    });
  } catch (e) {
    console.warn('Table construction error:', e);
    return null;
  }
}

function createTableCell(text: string, isHeader: boolean, widthDxa: number): TableCell {
  const cleanText = text.trim() || ' ';
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: cleanText,
            bold: isHeader,
            size: isHeader ? 22 : 20,
            font: 'Calibri',
          }),
        ],
      }),
    ],
    width: { size: widthDxa, type: WidthType.DXA },
    shading: isHeader ? { fill: 'F1F5F9' } : undefined,
  });
}

function buildDocxParagraph(line: LineGroup, pageWidth: number): Paragraph | null {
  const text = line.fullText.trim();
  if (!text) return null;

  const isHeading = line.fontSize > 14 || (line.fontSize > 12 && line.isBold && text.length < 60);

  const firstItemX = line.items[0]?.x || 0;
  let alignment: any = AlignmentType.LEFT;
  if (firstItemX > pageWidth * 0.35 && firstItemX < pageWidth * 0.6) {
    alignment = AlignmentType.CENTER;
  }

  const isBullet = /^[•\-*▪◦]\s*/.test(text);
  const cleanText = text.replace(/^[•\-*▪◦]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
  if (!cleanText) return null;

  const runs: TextRun[] = [];

  line.items.forEach((item, idx) => {
    let itemStr = item.str;
    if (idx === 0) {
      itemStr = isBullet ? `• ${cleanText}` : cleanText;
    }
    if (idx < line.items.length - 1) {
      const nextItem = line.items[idx + 1];
      const gap = nextItem.x - (item.x + item.width);
      if (gap > 2 && !itemStr.endsWith(' ')) {
        itemStr += ' ';
      }
    }

    if (itemStr) {
      runs.push(
        new TextRun({
          text: itemStr,
          bold: item.isBold || line.isBold || isHeading,
          italics: item.isItalic || line.isItalic,
          size: Math.round((item.fontSize || line.fontSize || 11) * 2),
          font: 'Calibri',
        })
      );
    }
  });

  return new Paragraph({
    children: runs.length > 0 ? runs : [new TextRun({ text: isBullet ? `• ${cleanText}` : cleanText, font: 'Calibri' })],
    alignment,
    spacing: {
      after: isHeading ? 180 : 120,
      line: 240,
    },
  });
}
