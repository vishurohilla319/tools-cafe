import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { Download, Contact } from 'lucide-react';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';

export const IdCardMaker: React.FC = () => {

  // Basic Info Form State
  const [companyName, setCompanyName] = useState('Tools Cafe Solutions');
  const [name, setName] = useState('Rahul Sharma');
  const [role, setRole] = useState('Senior Administrator');
  const [idNumber, setIdNumber] = useState('EMP-2026-9482');
  const [dept, setDept] = useState('IT Operations');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [email, setEmail] = useState('r.sharma@company.com');
  const [expiry, setExpiry] = useState('31/12/2030');

  // Photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoObj, setPhotoObj] = useState<HTMLImageElement | null>(null);

  // Styling Configs
  const [themeColor, setThemeColor] = useState('#0f172a'); // default slate-900
  const [layout, setLayout] = useState<'portrait' | 'landscape'>('portrait');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

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

  // Convert Hex to RGB object
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  // Helper to crop image as a square or rect and return bytes
  const getPhotoBytes = (): Promise<Uint8Array | null> => {
    return new Promise((resolve) => {
      if (!photoObj) {
        resolve(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      
      const size = Math.min(photoObj.width, photoObj.height);
      const sx = (photoObj.width - size) / 2;
      const sy = (photoObj.height - size) / 2;
      
      ctx.drawImage(photoObj, sx, sy, size, size, 0, 0, 200, 200);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.readAsArrayBuffer(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  // Compiles PDF with front and back of ID card
  const compilePdf = async () => {
    setIsProcessing(true);
    setProgress(20);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.27, 841.89]); // A4 Page

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      setProgress(45);

      // Embedded Cardholder Photo
      let embeddedPhoto = null;
      const imgBytes = await getPhotoBytes();
      if (imgBytes) {
        embeddedPhoto = await pdfDoc.embedJpg(imgBytes);
      }

      setProgress(70);

      // Card Dimensions in Points (Standard PVC size: 85.6 mm x 54 mm -> 242.6 pt x 153 pt)
      const w = layout === 'portrait' ? 153 : 242.6;
      const h = layout === 'portrait' ? 242.6 : 153;

      const rgbTheme = hexToRgb(themeColor);
      const rgbGrey = rgb(0.95, 0.95, 0.95);
      const rgbDark = rgb(0.1, 0.1, 0.1);
      const rgbWhite = rgb(1, 1, 1);

      // Centered positions on A4 page
      const midX = 595.27 / 2;
      const yFront = 500;
      const yBack = 200;

      const drawCardBorder = (x: number, y: number) => {
        // Draw Card base background
        page.drawRectangle({
          x: x - w / 2,
          y: y,
          width: w,
          height: h,
          color: rgbWhite,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1
        });
      };

      if (layout === 'portrait') {
        // --- PORTRAIT ID CARD ---
        
        // --- FRONT CARD ---
        drawCardBorder(midX, yFront);
        
        // Theme Header band
        page.drawRectangle({
          x: midX - w / 2,
          y: yFront + h - 40,
          width: w,
          height: 40,
          color: rgbTheme
        });

        // Company text
        const compW = fontBold.widthOfTextAtSize(companyName, 9);
        page.drawText(companyName, {
          x: midX - compW / 2,
          y: yFront + h - 24,
          size: 9,
          font: fontBold,
          color: rgbWhite
        });

        // Cardholder photo rectangle
        const photoY = yFront + h - 110;
        if (embeddedPhoto) {
          page.drawImage(embeddedPhoto, {
            x: midX - 25,
            y: photoY,
            width: 50,
            height: 50
          });
        } else {
          page.drawRectangle({
            x: midX - 25,
            y: photoY,
            width: 50,
            height: 50,
            color: rgbGrey,
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 0.5
          });
        }

        // Details
        let dy = yFront + h - 130;
        
        const drawCenteredText = (text: string, size: number, font: any, color: any) => {
          const txtW = font.widthOfTextAtSize(text, size);
          page.drawText(text, {
            x: midX - txtW / 2,
            y: dy,
            size: size,
            font: font,
            color: color
          });
          dy -= (size + 5);
        };

        drawCenteredText(name, 10, fontBold, rgbDark);
        drawCenteredText(role, 8, fontRegular, rgb(0.4, 0.4, 0.4));
        
        dy -= 8;
        drawCenteredText(`ID NO: ${idNumber}`, 7.5, fontBold, rgbDark);
        drawCenteredText(`Dept: ${dept}`, 7.5, fontRegular, rgb(0.2, 0.2, 0.2));

        // Footer band
        page.drawRectangle({
          x: midX - w / 2,
          y: yFront,
          width: w,
          height: 15,
          color: rgbTheme
        });
        
        const footW = fontBold.widthOfTextAtSize('IDENTITY CARD', 6.5);
        page.drawText('IDENTITY CARD', {
          x: midX - footW / 2,
          y: yFront + 4.5,
          size: 6.5,
          font: fontBold,
          color: rgbWhite
        });

        // --- BACK CARD ---
        drawCardBorder(midX, yBack);

        // Header band
        page.drawRectangle({
          x: midX - w / 2,
          y: yBack + h - 25,
          width: w,
          height: 25,
          color: rgbTheme
        });

        const compW2 = fontBold.widthOfTextAtSize(companyName, 8);
        page.drawText(companyName, {
          x: midX - compW2 / 2,
          y: yBack + h - 15,
          size: 8,
          font: fontBold,
          color: rgbWhite
        });

        // Terms and conditions
        let by = yBack + h - 50;
        const drawBackLine = (text: string) => {
          const tw = fontRegular.widthOfTextAtSize(text, 6);
          page.drawText(text, {
            x: midX - tw / 2,
            y: by,
            size: 6,
            font: fontRegular,
            color: rgb(0.3, 0.3, 0.3)
          });
          by -= 10;
        };

        drawBackLine('If found, please return this card to');
        drawBackLine('the IT Operations center office.');
        drawBackLine('This card is non-transferable.');

        // Phone & Email
        by -= 12;
        drawBackLine(`Tel: ${phone}`);
        drawBackLine(`Email: ${email}`);
        drawBackLine(`Valid Till: ${expiry}`);

        // Mock Barcode
        const barY = yBack + 20;
        page.drawRectangle({
          x: midX - 40,
          y: barY,
          width: 80,
          height: 18,
          color: rgbDark
        });
        
        // draw thin white stripes inside barcode
        for (let i = -30; i < 35; i += 6) {
          page.drawRectangle({
            x: midX + i,
            y: barY,
            width: 2,
            height: 18,
            color: rgbWhite
          });
        }
      } else {
        // --- LANDSCAPE ID CARD ---
        
        // --- FRONT CARD ---
        drawCardBorder(midX, yFront);

        // Theme Sidebar band (left)
        page.drawRectangle({
          x: midX - w / 2,
          y: yFront,
          width: 60,
          height: h,
          color: rgbTheme
        });

        // Company vertical text / logo
        page.drawText(companyName.length > 15 ? companyName.slice(0, 15) + '..' : companyName, {
          x: midX - w / 2 + 15,
          y: yFront + 25,
          size: 7.5,
          font: fontBold,
          color: rgbWhite,
          rotate: degrees(90)
        });

        // Cardholder photo
        if (embeddedPhoto) {
          page.drawImage(embeddedPhoto, {
            x: midX - w / 2 + 75,
            y: yFront + h / 2 - 25,
            width: 50,
            height: 50
          });
        } else {
          page.drawRectangle({
            x: midX - w / 2 + 75,
            y: yFront + h / 2 - 25,
            width: 50,
            height: 50,
            color: rgbGrey,
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 0.5
          });
        }

        // Details right-aligned
        let rx = midX + w / 2 - 100;
        
        page.drawText(name, { x: rx, y: yFront + h - 45, size: 10, font: fontBold, color: rgbDark });
        page.drawText(role, { x: rx, y: yFront + h - 57, size: 7.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(`ID: ${idNumber}`, { x: rx, y: yFront + h - 77, size: 7, font: fontBold, color: rgbDark });
        page.drawText(`Dept: ${dept}`, { x: rx, y: yFront + h - 87, size: 7, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

        // --- BACK CARD ---
        drawCardBorder(midX, yBack);

        // Sidebar band (left)
        page.drawRectangle({
          x: midX - w / 2,
          y: yBack,
          width: 15,
          height: h,
          color: rgbTheme
        });

        let bx = midX - w / 2 + 35;
        let by = yBack + h - 35;

        const drawLandscapeBackLine = (text: string, isBold = false) => {
          page.drawText(text, {
            x: bx,
            y: by,
            size: 6.5,
            font: isBold ? fontBold : fontRegular,
            color: rgbDark
          });
          by -= 12;
        };

        drawLandscapeBackLine('Terms & Conditions:', true);
        drawLandscapeBackLine('1. This identity card remains the property of the issuer.');
        drawLandscapeBackLine('2. Non-transferable. Access-control clearance card.');
        
        by -= 5;
        drawLandscapeBackLine(`Support: ${phone}`);
        drawLandscapeBackLine(`Valid Till: ${expiry}`);

        // Mock Barcode on bottom right
        page.drawRectangle({
          x: midX + w / 2 - 80,
          y: yBack + 15,
          width: 70,
          height: 15,
          color: rgbDark
        });
        
        for (let i = -30; i < 35; i += 6) {
          page.drawRectangle({
            x: midX + w / 2 - 45 + i,
            y: yBack + 15,
            width: 2,
            height: 15,
            color: rgbWhite
          });
        }
      }

      setProgress(90);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error building ID badge PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearForm = () => {
    setCompanyName('');
    setName('');
    setRole('');
    setIdNumber('');
    setDept('');
    setPhone('');
    setEmail('');
    setExpiry('');
    setPhotoUrl(null);
    setPhotoObj(null);
    setPdfBlobUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="id-card-maker"
        title="ID Card & Badge Maker"
        description="Design employee identity badges or student ID cards. Embed profile photos, customize theme branding colors, and generate high-resolution print-ready PDFs."
        category="idcard"
        categoryName="ID Card Tools"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Editor Form Columns (5 cols) */}
        <div className="lg:col-span-5 space-y-6 max-h-[85vh] overflow-y-auto pr-2 pb-12 text-xs font-semibold">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Badge Form Editor
            </h3>
            <button onClick={clearForm} className="text-[10px] text-red-500 hover:underline">
              Clear Fields
            </button>
          </div>

          {/* Company Details */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-3.5 shadow-sm">
            <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Institution / Company
            </h4>

            <div className="space-y-1">
              <label>Institution / Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label>Theme / Header Color</label>
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
          </div>

          {/* Holder Details */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-3.5 shadow-sm">
            <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Cardholder details
            </h4>

            <div className="space-y-1">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Job Title / Role</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => { setRole(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>Department</label>
                <input
                  type="text"
                  value={dept}
                  onChange={(e) => { setDept(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>ID Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => { setIdNumber(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>Valid Till / Expiry</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => { setExpiry(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label>Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full border-0 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-3.5 shadow-sm">
            <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Backside Contacts (Support)
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Emergency Tel</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>Emergency Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Live Preview & Layout Settings
            </h3>
          </div>

          {/* Layout Configuration */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card flex flex-wrap gap-4 items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-3">
              <span>Card Layout orientation:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setLayout('portrait'); setPdfBlobUrl(null); }}
                  className={`px-3 py-1 rounded-md border text-[10px] ${
                    layout === 'portrait'
                      ? 'border-brand-500 bg-brand-500/5 text-brand-650'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Portrait ID
                </button>
                <button
                  onClick={() => { setLayout('landscape'); setPdfBlobUrl(null); }}
                  className={`px-3 py-1 rounded-md border text-[10px] ${
                    layout === 'landscape'
                      ? 'border-brand-500 bg-brand-500/5 text-brand-650'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Landscape ID
                </button>
              </div>
            </div>
          </div>

          {/* Cardholder Visual badges */}
          <div className="rounded-2xl border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-[#0c0d15] p-8 flex flex-col md:flex-row gap-8 items-center justify-center min-h-[400px] shadow-lg">
            
            {/* Front Card Preview */}
            <div
              className="bg-white text-slate-900 border border-slate-200 rounded-xl shadow-lg relative overflow-hidden flex flex-col justify-between shrink-0"
              style={{
                width: layout === 'portrait' ? '180px' : '280px',
                height: layout === 'portrait' ? '280px' : '180px',
              }}
            >
              {/* Header block */}
              <div className="p-3 text-center text-white" style={{ backgroundColor: themeColor }}>
                <h4 className="text-[10px] font-black uppercase tracking-wider truncate">
                  {companyName || 'COMPANY NAME'}
                </h4>
              </div>

              {/* Center layout */}
              <div className={`p-4 flex grow ${layout === 'portrait' ? 'flex-col items-center justify-center text-center' : 'flex-row items-center gap-4 justify-between'}`}>
                
                {/* Photo */}
                <div className={`shrink-0 border-2 rounded ${photoUrl ? 'border-slate-100' : 'border-slate-200 bg-slate-50 flex items-center justify-center'}`} style={{ width: '55px', height: '55px' }}>
                  {photoUrl ? (
                    <img src={photoUrl} alt="Badge" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-[9px] font-bold text-slate-400">PHOTO</div>
                  )}
                </div>

                {/* Details */}
                <div className={layout === 'portrait' ? 'mt-3 space-y-0.5' : 'text-left grow space-y-0.5'}>
                  <div className="text-xs font-black text-slate-850 truncate max-w-[150px]">{name || 'Holder Name'}</div>
                  <div className="text-[9px] font-bold text-slate-400 truncate max-w-[150px]">{role || 'Role/Title'}</div>
                  <div className="pt-2 text-[8px] font-bold text-slate-500">
                    <span className="block">ID: {idNumber}</span>
                    <span className="block">Dept: {dept}</span>
                  </div>
                </div>

              </div>

              {/* Bottom footer bar */}
              <div className="p-1.5 text-center text-white font-bold text-[8px] tracking-widest" style={{ backgroundColor: themeColor }}>
                IDENTITY CARD
              </div>
            </div>

            {/* Back Card Preview */}
            <div
              className="bg-white text-slate-900 border border-slate-200 rounded-xl shadow-lg relative overflow-hidden flex flex-col justify-between shrink-0"
              style={{
                width: layout === 'portrait' ? '180px' : '280px',
                height: layout === 'portrait' ? '280px' : '180px',
              }}
            >
              {/* Header band */}
              <div className="p-2 text-center text-white" style={{ backgroundColor: themeColor }}>
                <h4 className="text-[9px] font-black uppercase tracking-wider truncate">
                  {companyName}
                </h4>
              </div>

              {/* T&C conditions */}
              <div className="p-3 grow flex flex-col justify-center text-[7px] text-slate-500 font-bold space-y-1.5 text-center">
                <p>If found, please return this card to company office.</p>
                <div className="border-t border-slate-100 my-1" />
                <p>Emergency: {phone}</p>
                <p>Valid Till: {expiry}</p>
              </div>

              {/* Barcode block */}
              <div className="p-2 flex flex-col items-center bg-slate-50 border-t border-slate-100">
                {/* Simulated barcode */}
                <div className="h-6 w-24 bg-slate-800 flex items-center justify-around">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="h-full bg-white" style={{ width: i % 3 === 0 ? '1.5px' : '3px' }} />
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Compilation controls */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-4">
            {isProcessing && <ProgressBar progress={progress} statusText="Compiling ID Badges..." />}

            {pdfBlobUrl ? (
              <div className="grid grid-cols-2 gap-4">
                <a
                  href={pdfBlobUrl}
                  download={`${name.replace(/\s+/g, '_')}_ID_Card.pdf`}
                  className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                >
                  <Download size={15} />
                  <span>Download Card PDF</span>
                </a>

                <button
                  onClick={() => {
                    const win = window.open(pdfBlobUrl);
                    win?.print();
                  }}
                  className="py-3 rounded-xl border border-slate-250 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Print Badges</span>
                </button>
              </div>
            ) : (
              <button
                onClick={compilePdf}
                disabled={isProcessing}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-650/10 hover:scale-[1.01] transition-all"
              >
                <Contact size={15} />
                <span>Generate ID Badge PDF</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default IdCardMaker;
