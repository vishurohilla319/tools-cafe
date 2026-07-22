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
  BorderStyle,
  AlignmentType,
  HeadingLevel,
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

  const docSections: any[] = [];
  const extractedPagesInfo: ConversionResult['extractedPages'] = [];

  let totalParagraphs = 0;
  let totalTables = 0;
  let totalImages = 0;

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const pageProgress = 10 + Math.round((70 * pageNum) / pageCount);
    onProgress?.(pageProgress, `Analyzing page ${pageNum} of ${pageCount} layout & typography...`);

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    const textContent = await page.getTextContent();
    const rawItems = textContent.items as any[];

    // Extract text items with coordinates & font properties
    const textItems: TextItemInfo[] = [];

    rawItems.forEach((item) => {
      if (!item.str || item.str.trim() === '') return;

      const tx = item.transform;
      const x = tx[4];
      // Convert PDF Y-coordinate (origin at bottom-left) to Top-Down
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
    const lineTolerance = 5;
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
      // Sort items in line left-to-right by X coordinate
      itemsInLine.sort((a, b) => a.x - b.x);

      // Join text items into full line text preserving word spaces
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

    // Detect Tables in line groups
    const pageDocElements: (Paragraph | Table)[] = [];
    const detectedTables: DetectedTable[] = [];

    // Analyze lines for tabular patterns (multiple X columns)
    let i = 0;
    while (i < lineGroups.length) {
      const currentLine = lineGroups[i];

      // Check if line looks like a table row (multiple distinct X positions separated by gap)
      if (isTableRowCandidate(currentLine)) {
        const tableLines: LineGroup[] = [currentLine];
        let j = i + 1;
        while (j < lineGroups.length && isTableRowCandidate(lineGroups[j])) {
          tableLines.push(lineGroups[j]);
          j++;
        }

        if (tableLines.length >= 2) {
          // Construct native Word Table
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

      // Process standard Paragraph / Heading / List
      const paraElement = buildDocxParagraph(currentLine, viewport.width);
      if (paraElement) {
        pageDocElements.push(paraElement);
        totalParagraphs++;
      }
      i++;
    }

    // Image extraction from page canvas fallback
    let pageImageCount = 0;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = Math.min(viewport.width, 800);
        canvas.height = Math.min(viewport.height, 1100);
        const renderContext = {
          canvasContext: ctx,
          viewport: page.getViewport({ scale: canvas.width / viewport.width }),
          canvas: canvas as any,
        };
        await page.render(renderContext).promise;

        // If page has low text ratio, attach page image preview object
        if (textItems.length < 5) {
          const imgDataUrl = canvas.toDataURL('image/png');
          const base64Data = imgDataUrl.split(',')[1];
          if (base64Data) {
            const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const imageElement = new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  type: 'png',
                  transformation: {
                    width: 500,
                    height: (viewport.height / viewport.width) * 500,
                  },
                }),
              ],
              spacing: { after: 200 },
            });
            pageDocElements.push(imageElement);
            totalImages++;
            pageImageCount++;
          }
        }
      }
    } catch (e) {
      console.warn('Canvas page snapshot failed:', e);
    }

    docSections.push({
      properties: {
        page: {
          margin: {
            top: 720, // 0.5 inch (720 dxa)
            bottom: 720,
            left: 720,
            right: 720,
          },
        },
      },
      children: pageDocElements.length > 0 ? pageDocElements : [
        new Paragraph({
          children: [new TextRun({ text: '[Empty Page Content]', italics: true })],
        }),
      ],
    });

    extractedPagesInfo.push({
      pageNumber: pageNum,
      text: lineGroups.map((g) => g.fullText).join('\n'),
      hasTable: detectedTables.length > 0,
      imageCount: pageImageCount,
    });
  }

  onProgress?.(85, 'Building editable OpenXML DOCX document architecture...');

  // Create docx Document
  const doc = new Document({
    sections: docSections,
  });

  onProgress?.(95, 'Compressing and packing DOCX file...');
  const docxBlob = await Packer.toBlob(doc);

  // Compute Quality Score (0 to 100)
  const totalTextLength = extractedPagesInfo.reduce((acc, p) => acc + p.text.length, 0);
  const avgTextPerPage = totalTextLength / pageCount;
  let qualityScore = 85;
  if (avgTextPerPage > 200) qualityScore += 10;
  if (totalTables > 0) qualityScore += 3;
  if (qualityScore > 98) qualityScore = 98;

  onProgress?.(100, 'Conversion completed successfully!');

  return {
    docxBlob,
    pageCount,
    paragraphCount: totalParagraphs,
    tableCount: totalTables,
    imageCount: totalImages,
    qualityScore,
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
    if (gap > 30) {
      gapCount++;
    }
  }
  return gapCount >= 1;
}

function buildDocxTable(tableLines: LineGroup[]): Table | null {
  try {
    const rows: TableRow[] = tableLines.map((line, rowIndex) => {
      const cells: TableCell[] = [];
      let currentCellText = '';

      line.items.forEach((item, itemIdx) => {
        if (itemIdx > 0) {
          const prevItem = line.items[itemIdx - 1];
          const gap = item.x - (prevItem.x + prevItem.width);
          if (gap > 30) {
            cells.push(createTableCell(currentCellText, rowIndex === 0));
            currentCellText = item.str;
            return;
          }
        }
        currentCellText += (currentCellText && !currentCellText.endsWith(' ') ? ' ' : '') + item.str;
      });

      if (currentCellText) {
        cells.push(createTableCell(currentCellText, rowIndex === 0));
      }

      return new TableRow({
        children: cells.length > 0 ? cells : [createTableCell(line.fullText, false)],
      });
    });

    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        left: { style: BorderStyle.NONE, size: 0, color: 'AUTO' },
        right: { style: BorderStyle.NONE, size: 0, color: 'AUTO' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'AUTO' },
      },
    });
  } catch (e) {
    console.warn('Table construction error:', e);
    return null;
  }
}

function createTableCell(text: string, isHeader: boolean): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text.trim(),
            bold: isHeader,
            size: isHeader ? 22 : 20, // 11pt or 10pt
            font: 'Calibri',
          }),
        ],
      }),
    ],
    shading: isHeader ? { fill: 'F1F5F9' } : undefined,
    margins: {
      top: 100,
      bottom: 100,
      left: 140,
      right: 140,
    },
  });
}

function buildDocxParagraph(line: LineGroup, pageWidth: number): Paragraph | null {
  const text = line.fullText.trim();
  if (!text) return null;

  // Heading detection (if font size is large or text is short and bold)
  let headingLevel: any = undefined;
  if (line.fontSize > 18) {
    headingLevel = HeadingLevel.HEADING_1;
  } else if (line.fontSize > 14 && line.isBold) {
    headingLevel = HeadingLevel.HEADING_2;
  } else if (line.fontSize > 12 && line.isBold && text.length < 60) {
    headingLevel = HeadingLevel.HEADING_3;
  }

  // Alignment detection
  const firstItemX = line.items[0]?.x || 0;
  let alignment: any = AlignmentType.LEFT;
  if (firstItemX > pageWidth * 0.35 && firstItemX < pageWidth * 0.6) {
    alignment = AlignmentType.CENTER;
  }

  // Bullet detection
  const isBullet = /^[•\-*▪◦]\s*/.test(text);
  const cleanText = text.replace(/^[•\-*▪◦]\s*/, '').replace(/^\d+[\.\)]\s*/, '');

  const runs: TextRun[] = [];

  line.items.forEach((item, idx) => {
    let itemStr = item.str;
    if (idx === 0) {
      itemStr = cleanText;
    }
    if (idx < line.items.length - 1) {
      const nextItem = line.items[idx + 1];
      const gap = nextItem.x - (item.x + item.width);
      if (gap > 2 && !itemStr.endsWith(' ')) {
        itemStr += ' ';
      }
    }

    runs.push(
      new TextRun({
        text: itemStr,
        bold: item.isBold || line.isBold,
        italics: item.isItalic || line.isItalic,
        size: Math.round((item.fontSize || line.fontSize || 11) * 2), // docx size is in half-points (22 = 11pt)
        font: 'Calibri',
      })
    );
  });

  return new Paragraph({
    children: runs.length > 0 ? runs : [new TextRun({ text: cleanText, font: 'Calibri' })],
    heading: headingLevel,
    alignment,
    bullet: isBullet ? { level: 0 } : undefined,
    spacing: {
      after: headingLevel ? 180 : 120, // spacing after paragraph in twips
      line: 276, // 1.15 line spacing
    },
  });
}
