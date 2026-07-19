import React, { useState } from 'react';
import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, RefreshCw, Settings } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

interface ExtractedSlide {
  slideNumber: number;
  title: string;
  bullets: string[];
}

export const PptToPdf: React.FC = () => {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [slides, setSlides] = useState<ExtractedSlide[]>([]);
  
  // PDF format configuration
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [layout, setLayout] = useState<'1x1' | '2x2'>('1x1'); // Slides per page

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setSlides([]);
    setPdfUrl(null);
    setIsProcessing(true);
    setProgress(20);
    setLoadingText('Unzipping presentation file...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      
      const slideFiles: { name: string; zipEntry: any }[] = [];
      zip.folder("ppt/slides")?.forEach((relativePath, fileEntry) => {
        if (relativePath.endsWith(".xml") && relativePath.startsWith("slide")) {
          slideFiles.push({ name: relativePath, zipEntry: fileEntry });
        }
      });

      // Correct sorting:
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });

      if (slideFiles.length === 0) {
        throw new Error('No slides found in the PowerPoint presentation.');
      }

      const parsedSlides: ExtractedSlide[] = [];

      for (let idx = 0; idx < slideFiles.length; idx++) {
        const slide = slideFiles[idx];
        setProgress(Math.round(20 + (70 * (idx + 1)) / slideFiles.length));
        setLoadingText(`Parsing slide ${idx + 1} structure...`);

        const xmlText = await slide.zipEntry.async("string");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        // Extract text tokens
        // Text in PPTX is stored in `<a:t>` tags inside paragraph lists
        const textElements = xmlDoc.getElementsByTagName("a:t");
        const slideTextItems: string[] = [];
        
        for (let tIdx = 0; tIdx < textElements.length; tIdx++) {
          const val = textElements[tIdx].textContent?.trim();
          if (val) slideTextItems.push(val);
        }

        let slideTitle = `Slide ${idx + 1}`;
        const bullets: string[] = [];

        // Simple heuristic: First larger text block or first text is the title
        if (slideTextItems.length > 0) {
          slideTitle = slideTextItems[0];
          slideTextItems.slice(1).forEach((txt) => {
            if (txt.length > 1) bullets.push(txt);
          });
        }

        parsedSlides.push({
          slideNumber: idx + 1,
          title: slideTitle,
          bullets: bullets.slice(0, 12) // Keep preview compact
        });
      }

      setSlides(parsedSlides);
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      alert('Failed to parse PPTX file. Verify it is a valid, uncorrupted PowerPoint presentation.');
      setFile(null);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };
  const generatePdf = async () => {
    if (slides.length === 0 || !file) return;
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

    setLoadingText('Initializing PDF page compiler (local fallback)...');
    setProgress(20);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      // Letter landscape: 792 x 612 points
      let width = orientation === 'landscape' ? 792 : 612;
      let height = orientation === 'landscape' ? 612 : 792;

      setProgress(40);
      setLoadingText('Formatting slide layout...');

      if (layout === '1x1') {
        // One slide per page
        slides.forEach((slide) => {
          const page = pdfDoc.addPage([width, height]);
          
          // Draw slide outline border
          page.drawRectangle({
            x: 20,
            y: 20,
            width: width - 40,
            height: height - 40,
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 1,
            color: rgb(0.98, 0.98, 0.99),
          });

          // Draw Slide Header
          page.drawText(slide.title, {
            x: 50,
            y: height - 80,
            size: 24,
            font: fontBold,
            color: rgb(0.12, 0.16, 0.28),
          });

          // Draw underline for header
          page.drawLine({
            start: { x: 50, y: height - 95 },
            end: { x: width - 50, y: height - 95 },
            color: rgb(0.3, 0.4, 0.8),
            thickness: 2,
          });

          // Draw bullet points
          let currentY = height - 130;
          slide.bullets.forEach((bullet) => {
            if (currentY < 60) return; // boundary check

            // Draw bullet dot
            page.drawCircle({
              x: 65,
              y: currentY - 5,
              size: 3.5,
              color: rgb(0.3, 0.4, 0.8),
            });

            // Wrap text
            const maxChar = Math.floor((width - 120) / 7.5);
            let bulletLines: string[] = [];
            if (bullet.length > maxChar) {
              const words = bullet.split(' ');
              let line = '';
              words.forEach((w) => {
                const test = line ? `${line} ${w}` : w;
                if (test.length < maxChar) {
                  line = test;
                } else {
                  bulletLines.push(line);
                  line = w;
                }
              });
              if (line) bulletLines.push(line);
            } else {
              bulletLines.push(bullet);
            }

            bulletLines.forEach((lineText) => {
              page.drawText(lineText, {
                x: 80,
                y: currentY - 10,
                size: 13,
                font,
                color: rgb(0.2, 0.2, 0.2),
              });
              currentY -= 18;
            });
            currentY -= 8;
          });

          // Draw Page Footer
          page.drawText(`Slide ${slide.slideNumber} of ${slides.length}`, {
            x: width - 150,
            y: 35,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
        });
      } else {
        // 2x2 Layout: 4 slides per page
        const slidesPerPage = 4;
        const totalPages = Math.ceil(slides.length / slidesPerPage);

        for (let pIdx = 0; pIdx < totalPages; pIdx++) {
          const page = pdfDoc.addPage([width, height]);
          const slideW = (width - 60) / 2;
          const slideH = (height - 60) / 2;

          for (let sIdx = 0; sIdx < slidesPerPage; sIdx++) {
            const index = pIdx * slidesPerPage + sIdx;
            if (index >= slides.length) break;
            
            const slide = slides[index];
            const col = sIdx % 2;
            const row = Math.floor(sIdx / 2);

            const x = 20 + col * (slideW + 20);
            const y = height - 20 - (row + 1) * slideH - row * 20;

            // Draw slide boundary box
            page.drawRectangle({
              x,
              y,
              width: slideW,
              height: slideH,
              borderColor: rgb(0.85, 0.85, 0.85),
              borderWidth: 1,
              color: rgb(0.98, 0.98, 0.99),
            });

            // Slide Title in 2x2
            const truncatedTitle = slide.title.length > 25 ? slide.title.substring(0, 22) + '...' : slide.title;
            page.drawText(truncatedTitle, {
              x: x + 15,
              y: y + slideH - 30,
              size: 11,
              font: fontBold,
              color: rgb(0.12, 0.16, 0.28),
            });

            // Draw bullets (first 4 only in 2x2 to prevent overlap)
            let bulletY = y + slideH - 50;
            slide.bullets.slice(0, 4).forEach((bullet) => {
              if (bulletY < y + 20) return;

              page.drawCircle({
                x: x + 20,
                y: bulletY - 3,
                size: 2,
                color: rgb(0.3, 0.4, 0.8),
              });

              const maxChar = Math.floor((slideW - 40) / 5.5);
              const cleanBullet = bullet.length > maxChar ? bullet.substring(0, maxChar - 3) + '...' : bullet;

              page.drawText(cleanBullet, {
                x: x + 30,
                y: bulletY - 6,
                size: 8,
                font,
                color: rgb(0.2, 0.2, 0.2),
              });

              bulletY -= 14;
            });

            // Slide Index Label
            page.drawText(`Slide ${slide.slideNumber}`, {
              x: x + slideW - 50,
              y: y + 10,
              size: 8,
              font,
              color: rgb(0.5, 0.5, 0.5),
            });
          }
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
      alert('Failed to generate PDF slides.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="ppt-to-pdf"
        title={t('tool.pptToPdf.title')}
        description={t('tool.pptToPdf.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {!file ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".pptx"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload PowerPoint Presentation (.pptx)"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250">
                Presentation: {file.name}
              </h3>
              
              <button
                onClick={() => {
                  setFile(null);
                  setSlides([]);
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
                  <span>PDF presentation ready! Download or view below.</span>
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
              !isProcessing && slides.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slides.map((slide) => (
                    <div
                      key={slide.slideNumber}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-5 shadow-sm flex flex-col justify-between aspect-[4/3] relative overflow-hidden"
                    >
                      <div className="absolute top-2 right-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-[9px] px-2 py-0.5 rounded">
                        Slide {slide.slideNumber}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-heading text-sm font-extrabold text-slate-800 dark:text-slate-100 pr-10 truncate">
                          {slide.title}
                        </h4>
                        
                        <div className="w-full border-b border-slate-100 dark:border-slate-800/80 my-1" />
                        
                        <ul className="space-y-1.5">
                          {slide.bullets.slice(0, 4).map((bullet, bIdx) => (
                            <li key={bIdx} className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 leading-tight">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1" />
                              <span className="truncate">{bullet}</span>
                            </li>
                          ))}
                          {slide.bullets.length > 4 && (
                            <li className="text-[9px] text-slate-400 italic">
                              + {slide.bullets.length - 4} more points...
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Configuration Panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <Settings size={16} className="text-brand-500" />
                <span>PDF Page Layout</span>
              </h3>

              <div className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                {/* Orientation */}
                <div className="space-y-1.5">
                  <label>Page Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                </div>

                {/* Slides Per Page */}
                <div className="space-y-1.5">
                  <label>Handout Print Layout</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setLayout('1x1'); setPdfUrl(null); }}
                      className={`py-2 rounded-lg border text-center font-bold transition-all ${
                        layout === '1x1'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      Full Page Slide
                    </button>
                    <button
                      onClick={() => { setLayout('2x2'); setPdfUrl(null); }}
                      className={`py-2 rounded-lg border text-center font-bold transition-all ${
                        layout === '2x2'
                          ? 'border-brand-500 bg-brand-500/5 text-brand-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      4 Slides Handout
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <button
                  onClick={generatePdf}
                  disabled={isProcessing || slides.length === 0}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                >
                  <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                  <span>Convert PPT to PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PptToPdf;
