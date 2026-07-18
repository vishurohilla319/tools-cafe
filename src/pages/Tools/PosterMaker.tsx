import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, Palette } from 'lucide-react';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';

interface PosterTemplate {
  id: string;
  name: string;
  headline: string;
  subheading: string;
  details: string;
  cta: string;
}

const templatesList: PosterTemplate[] = [
  {
    id: 'opening',
    name: 'Grand Opening',
    headline: 'GRAND OPENING',
    subheading: 'WELCOME TO OUR NEW STORE',
    details: 'Visit us today to explore premium products and services.',
    cta: 'Flat 20% Discount on All Items!'
  },
  {
    id: 'sale',
    name: 'Super Sale / Discount',
    headline: 'MEGA SALE',
    subheading: 'LIMITED TIME OFFER ONLY',
    details: 'Huge discounts across all categories. Premium quality guaranteed.',
    cta: 'Up to 50% OFF - Hurry Up!'
  },
  {
    id: 'csc',
    name: 'CSC Services Flyer',
    headline: 'DIGITAL SERVICES',
    subheading: 'ALL GOVT & ONLINE SERVICES HERE',
    details: 'Aadhar updates, PAN cards, Passport applications, Tax filings, Utility bills, and Online admissions processed here.',
    cta: 'Fast & Secure Processing!'
  }
];

export const PosterMaker: React.FC = () => {

  // Selected preset template
  const [selectedTemplateId, setSelectedTemplateId] = useState('opening');

  // Input states
  const [headline, setHeadline] = useState('GRAND OPENING');
  const [subheading, setSubheading] = useState('WELCOME TO OUR NEW STORE');
  const [details, setDetails] = useState('Visit us today to explore premium products and services.');
  const [cta, setCta] = useState('Flat 20% Discount on All Items!');
  const [footerContact, setFooterContact] = useState('Address: Main Road Market  |  Phone: +91 98765 43210');

  // Design configs
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [themeColor, setThemeColor] = useState('#b91c1c'); // red-700
  const [bgColor, setBgColor] = useState('#fffdfa'); // cream
  const [showBorder, setShowBorder] = useState(true);

  // Embedded Photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoObj, setPhotoObj] = useState<HTMLImageElement | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Sync templates on change
  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const tpl = templatesList.find((t) => t.id === id);
    if (tpl) {
      setHeadline(tpl.headline);
      setSubheading(tpl.subheading);
      setDetails(tpl.details);
      setCta(tpl.cta);
      setPdfBlobUrl(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setPhotoObj(img);
    };
    setPdfBlobUrl(null);
  };

  const clearPhoto = () => {
    setPhotoUrl(null);
    setPhotoObj(null);
    setPdfBlobUrl(null);
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  const getPhotoBytes = (): Promise<Uint8Array | null> => {
    return new Promise((resolve) => {
      if (!photoObj) {
        resolve(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Maintain aspect ratio cover fit
      const aspect = photoObj.width / photoObj.height;
      let sw = photoObj.width;
      let sh = photoObj.height;
      let sx = 0;
      let sy = 0;

      if (aspect > 4/3) {
        sw = photoObj.height * (4/3);
        sx = (photoObj.width - sw) / 2;
      } else {
        sh = photoObj.width * (3/4);
        sy = (photoObj.height - sh) / 2;
      }

      ctx.drawImage(photoObj, sx, sy, sw, sh, 0, 0, 400, 300);

      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.readAsArrayBuffer(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  const getWrappedLines = (text: string, font: any, size: number, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Compiles PDF flyer
  const compilePdf = async () => {
    setIsProcessing(true);
    setProgress(20);

    try {
      const pdfDoc = await PDFDocument.create();
      // A4 page size coordinate points: 595.27 x 841.89
      const pagew = orientation === 'portrait' ? 595.27 : 841.89;
      const pageh = orientation === 'portrait' ? 841.89 : 595.27;

      const page = pdfDoc.addPage([pagew, pageh]);

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      setProgress(45);

      // Ingest showcase photo
      let embeddedPhoto = null;
      const imgBytes = await getPhotoBytes();
      if (imgBytes) {
        embeddedPhoto = await pdfDoc.embedJpg(imgBytes);
      }

      setProgress(75);

      const rgbTheme = hexToRgb(themeColor);
      const rgbBg = hexToRgb(bgColor);
      const rgbDark = rgb(0.12, 0.12, 0.12);
      const rgbWhite = rgb(1, 1, 1);

      // 1. Draw Page Base
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pagew,
        height: pageh,
        color: rgbBg
      });

      // 2. Draw Decorative Border
      if (showBorder) {
        page.drawRectangle({
          x: 20,
          y: 20,
          width: pagew - 40,
          height: pageh - 40,
          borderColor: rgbTheme,
          borderWidth: 3
        });
        page.drawRectangle({
          x: 25,
          y: 25,
          width: pagew - 50,
          height: pageh - 50,
          borderColor: rgb(0.85, 0.7, 0.2), // gold
          borderWidth: 1
        });
      }

      // Text and spacing calculations
      let y = pageh - 90;

      const drawCenteredText = (text: string, size: number, font: any, color: any, isHeadline = false) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, {
          x: pagew / 2 - textWidth / 2,
          y,
          size: size,
          font: font,
          color: color
        });
        
        if (isHeadline) {
          // Draw bold gold subtitle underline
          y -= (size + 15);
          page.drawLine({
            start: { x: pagew / 2 - 80, y },
            end: { x: pagew / 2 + 80, y },
            thickness: 2,
            color: rgb(0.85, 0.7, 0.2)
          });
          y -= 20;
        } else {
          y -= (size + 15);
        }
      };

      // 3. Draw Headline / Header
      if (headline) {
        drawCenteredText(headline, 28, fontBold, rgbTheme, true);
      }

      // 4. Subheading
      if (subheading) {
        drawCenteredText(subheading, 14, fontBold, rgbDark);
      }

      // 5. Embed Product Photo Showcase
      if (embeddedPhoto) {
        const pWidth = orientation === 'portrait' ? 240 : 200;
        const pHeight = orientation === 'portrait' ? 180 : 150;
        const pX = pagew / 2 - pWidth / 2;
        y -= (pHeight + 10);
        
        page.drawImage(embeddedPhoto, {
          x: pX,
          y: y,
          width: pWidth,
          height: pHeight
        });

        // Frame border around photo
        page.drawRectangle({
          x: pX,
          y: y,
          width: pWidth,
          height: pHeight,
          borderColor: rgbTheme,
          borderWidth: 1.5
        });

        y -= 25;
      } else {
        y -= 15;
      }

      // 6. Details paragraphs
      if (details) {
        const wrappedDetails = getWrappedLines(details, fontRegular, 11, pagew - 120);
        wrappedDetails.forEach((line) => {
          const tw = fontRegular.widthOfTextAtSize(line, 11);
          page.drawText(line, {
            x: pagew / 2 - tw / 2,
            y,
            size: 11,
            font: fontRegular,
            color: rgb(0.3, 0.3, 0.3)
          });
          y -= 16;
        });
        y -= 15;
      }

      // 7. Call To Action (Offer Ribbon)
      if (cta) {
        const ribbonW = pagew - 100;
        const ribbonH = 35;
        const ribbonX = pagew / 2 - ribbonW / 2;
        y -= ribbonH;

        page.drawRectangle({
          x: ribbonX,
          y: y,
          width: ribbonW,
          height: ribbonH,
          color: rgbTheme
        });

        const ctaW = fontBold.widthOfTextAtSize(cta, 12);
        page.drawText(cta, {
          x: pagew / 2 - ctaW / 2,
          y: y + 12,
          size: 12,
          font: fontBold,
          color: rgbWhite
        });

        y -= 30;
      }

      // 8. Footer Contact block Y coordinate positioning
      if (footerContact) {
        const footW = fontRegular.widthOfTextAtSize(footerContact, 8.5);
        page.drawText(footerContact, {
          x: pagew / 2 - footW / 2,
          y: 50,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4)
        });
      }

      setProgress(90);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error building flyer PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="poster-maker"
        title="Shop Banner & Poster Maker"
        description="Design professional flyers or sales promotion banners for walk-in business customers. Ingest images, select orientation layouts, and compile PDF posters."
        category="design"
        categoryName="Design Studio"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-6 max-h-[85vh] overflow-y-auto pr-2 pb-12 text-xs font-semibold">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Flyer Form Editor
            </h3>
            
            <div className="flex items-center gap-1.5 text-[10px] text-brand-650 font-bold">
              <span>Preset templates:</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="bg-transparent outline-none cursor-pointer"
              >
                {templatesList.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Form details card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-3.5 shadow-sm">
            <h4 className="font-heading text-xs font-bold text-slate-850 dark:text-slate-250 uppercase tracking-wider mb-2">
              Poster Text details
            </h4>

            <div className="space-y-1">
              <label>Main Headline (Vibrant)</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => { setHeadline(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none uppercase font-bold"
              />
            </div>

            <div className="space-y-1">
              <label>Subheading Notice</label>
              <input
                type="text"
                value={subheading}
                onChange={(e) => { setSubheading(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Promotion Body details</label>
              <textarea
                value={details}
                onChange={(e) => { setDetails(e.target.value); setPdfBlobUrl(null); }}
                rows={3}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label>Call to Action / Offer Ribbon</label>
              <input
                type="text"
                value={cta}
                onChange={(e) => { setCta(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Footer Contacts / Address info</label>
              <input
                type="text"
                value={footerContact}
                onChange={(e) => { setFooterContact(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>
          </div>

          {/* Design elements */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-4 shadow-sm">
            <h4 className="font-heading text-xs font-bold text-slate-850 dark:text-slate-250 uppercase tracking-wider mb-2">
              Style Configs
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label>Theme Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => { setThemeColor(e.target.value); setPdfBlobUrl(null); }}
                    className="w-8 h-8 rounded border-0 cursor-pointer overflow-hidden p-0"
                  />
                  <input
                    type="text"
                    value={themeColor}
                    onChange={(e) => { setThemeColor(e.target.value); setPdfBlobUrl(null); }}
                    className="w-20 px-2 py-1 border border-slate-200 bg-slate-50 dark:bg-slate-900 uppercase text-[10px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label>Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => { setBgColor(e.target.value); setPdfBlobUrl(null); }}
                    className="w-8 h-8 rounded border-0 cursor-pointer overflow-hidden p-0"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => { setBgColor(e.target.value); setPdfBlobUrl(null); }}
                    className="w-20 px-2 py-1 border border-slate-200 bg-slate-50 dark:bg-slate-900 uppercase text-[10px]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label>Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => { setOrientation(e.target.value as any); setPdfBlobUrl(null); }}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  <option value="portrait">Portrait A4 Flyer</option>
                  <option value="landscape">Landscape A4 Banner</option>
                </select>
              </div>

              <div className="space-y-1.5 flex items-center pt-5">
                <input
                  type="checkbox"
                  id="showBorder"
                  checked={showBorder}
                  onChange={(e) => { setShowBorder(e.target.checked); setPdfBlobUrl(null); }}
                  className="mr-2"
                />
                <label htmlFor="showBorder" className="cursor-pointer select-none">Show Border Frames</label>
              </div>
            </div>

            {/* Photo upload */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label>Embed Product / Service Scan Image (Optional)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="grow border-0 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                {photoUrl && (
                  <button onClick={clearPhoto} className="text-[10px] text-red-500 hover:underline">
                    Clear Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Poster Visual Preview
            </h3>
          </div>

          {/* HTML5 simulated poster card */}
          <div className="rounded-2xl border border-slate-250 dark:border-slate-800 bg-slate-100 dark:bg-[#0c0d15] p-8 flex items-center justify-center min-h-[450px] shadow-lg overflow-x-auto">
            <div
              className="border-4 shadow-xl flex flex-col justify-between p-6 transition-all relative overflow-hidden"
              style={{
                width: orientation === 'portrait' ? '280px' : '400px',
                height: orientation === 'portrait' ? '400px' : '280px',
                borderColor: showBorder ? themeColor : 'transparent',
                backgroundColor: bgColor,
                color: '#1e293b'
              }}
            >
              {/* Gold double line borders simulation */}
              {showBorder && (
                <div className="absolute inset-0.5 border border-amber-500/50 pointer-events-none" />
              )}

              {/* Title & Underline */}
              <div className="text-center">
                <h2 className="font-heading text-lg font-black tracking-wider uppercase" style={{ color: themeColor }}>
                  {headline || 'HEADLINE'}
                </h2>
                <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-0.5" />
              </div>

              {/* Subheading */}
              <div className="text-center font-bold text-[10px] text-slate-700 dark:text-slate-800 mt-2 px-2 truncate">
                {subheading || 'Subheading Message'}
              </div>

              {/* Product Photo */}
              {photoUrl ? (
                <div className="w-40 h-28 mx-auto border rounded overflow-hidden my-2 border-slate-200 bg-white">
                  <img src={photoUrl} alt="Product Showcase" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="my-2 h-4" />
              )}

              {/* Details paragraphs */}
              <div className="text-center text-[8px] text-slate-500 font-medium px-4 line-clamp-3 leading-relaxed">
                {details || 'Promotional body message details...'}
              </div>

              {/* CTA Ribbon */}
              {cta && (
                <div className="text-center text-[9px] font-bold text-white py-1 px-4 rounded shadow-sm my-2 truncate" style={{ backgroundColor: themeColor }}>
                  {cta}
                </div>
              )}

              {/* Footer Address */}
              <div className="text-center text-[7px] text-slate-450 mt-1 select-none truncate">
                {footerContact}
              </div>
            </div>
          </div>

          {/* Action panels */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-4">
            {isProcessing && <ProgressBar progress={progress} statusText="Compiling Flyer PDF..." />}

            {pdfBlobUrl ? (
              <div className="grid grid-cols-2 gap-4">
                <a
                  href={pdfBlobUrl}
                  download={`poster_${Date.now()}.pdf`}
                  className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                >
                  <Download size={15} />
                  <span>Download Poster PDF</span>
                </a>

                <button
                  onClick={() => {
                    const win = window.open(pdfBlobUrl);
                    win?.print();
                  }}
                  className="py-3 rounded-xl border border-slate-250 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Print Poster</span>
                </button>
              </div>
            ) : (
              <button
                onClick={compilePdf}
                disabled={isProcessing}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-650/10 hover:scale-[1.01] transition-all"
              >
                <Palette size={15} />
                <span>Generate Poster PDF</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PosterMaker;
