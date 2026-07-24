import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, HeartHandshake } from 'lucide-react';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import SEOSection from '../../components/shared/SEOSection';
import { useLanguage } from '../../context/LanguageContext';

export const MarriageBiodata: React.FC = () => {
  const { t } = useLanguage();

  // Personal Info State
  const [name, setName] = useState('Ananya Iyer');
  const [dob, setDob] = useState('12th June 1996');
  const [tob, setTob] = useState('08:45 AM');
  const [pob, setPob] = useState('Chennai, Tamil Nadu');
  const [rashi, setRashi] = useState('Mithun (Gemini)');
  const [nakshatra, setNakshatra] = useState('Ardra');
  const [height, setHeight] = useState("5'4\" (162 cm)");
  
  // Education & Work
  const [education, setEducation] = useState('M.Sc in Biotechnology');
  const [school, setSchool] = useState('University of Madras');
  const [profession, setProfession] = useState('Research Scientist');
  const [company, setCompany] = useState('Biocon India');
  const [income, setIncome] = useState('₹8,000,000 per annum');

  // Family Info
  const [father, setFather] = useState('Dr. Srinivasan Iyer (Physician)');
  const [mother, setMother] = useState('Mrs. Lakshmi Iyer (Homemaker)');
  const [siblings, setSiblings] = useState('1 Elder Brother (Married, Software Engineer in US)');
  const [gotra, setGotra] = useState('Shandilya');
  const [contact, setContact] = useState('+91 98400 12345 / l.iyer@email.com');
  const [address, setAddress] = useState('Flat 4B, Ruby Apartments, Adyar, Chennai - 600020');

  // Settings
  const [template, setTemplate] = useState<'traditional' | 'modern'>('traditional');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

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

  const compilePdf = async () => {
    setIsProcessing(true);
    setProgress(20);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.27, 841.89]); // A4 Page

      // Embed Fonts
      const isSerif = fontFamily === 'serif';
      const fontRegular = await pdfDoc.embedFont(isSerif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(isSerif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);

      setProgress(40);

      // Borders design based on template selection
      if (template === 'traditional') {
        // Deep Maroon outer border
        page.drawRectangle({
          x: 20,
          y: 20,
          width: 555.27,
          height: 801.89,
          borderColor: rgb(0.5, 0.05, 0.1),
          borderWidth: 3,
          color: rgb(1, 0.99, 0.98) // Saffron-tinted background
        });

        // Golden inner border
        page.drawRectangle({
          x: 26,
          y: 26,
          width: 543.27,
          height: 789.89,
          borderColor: rgb(0.85, 0.65, 0.15),
          borderWidth: 1.5
        });

        // Traditional Corner lines
        const offsets = [32, 783]; // bottom Y, top Y offsets
        offsets.forEach((yVal) => {
          // Horizontal corner accent
          page.drawLine({ start: { x: 30, y: yVal }, end: { x: 60, y: yVal }, thickness: 1, color: rgb(0.85, 0.65, 0.15) });
          page.drawLine({ start: { x: 535, y: yVal }, end: { x: 565, y: yVal }, thickness: 1, color: rgb(0.85, 0.65, 0.15) });
        });
      } else {
        // Modern Rose Gold Border
        page.drawRectangle({
          x: 20,
          y: 20,
          width: 555.27,
          height: 801.89,
          borderColor: rgb(0.8, 0.6, 0.65),
          borderWidth: 1.5,
          color: rgb(1, 1, 1)
        });
        page.drawRectangle({
          x: 24,
          y: 24,
          width: 547.27,
          height: 793.89,
          borderColor: rgb(0.9, 0.8, 0.82),
          borderWidth: 0.75
        });
      }

      setProgress(65);

      // Title & Invocation
      let y = 770;
      if (template === 'traditional') {
        page.drawText('|| Shree Ganeshay Namah ||', {
          x: 297.63,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.5, 0.05, 0.1)
        });
        // Center text alignment hack: subtract half width of text
        const invocationW = fontBold.widthOfTextAtSize('|| Shree Ganeshay Namah ||', 10);
        // Overwrite centered
        page.drawText('|| Shree Ganeshay Namah ||', {
          x: 297.63 - invocationW / 2,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.5, 0.05, 0.1)
        });
      }

      y -= 30;
      const titleText = 'BIODATA';
      const titleW = fontBold.widthOfTextAtSize(titleText, 22);
      page.drawText(titleText, {
        x: 297.63 - titleW / 2,
        y,
        size: 22,
        font: fontBold,
        color: template === 'traditional' ? rgb(0.5, 0.05, 0.1) : rgb(0.65, 0.45, 0.5)
      });

      // Underline title
      y -= 6;
      page.drawLine({
        start: { x: 297.63 - 40, y },
        end: { x: 297.63 + 40, y },
        thickness: 1,
        color: template === 'traditional' ? rgb(0.85, 0.65, 0.15) : rgb(0.8, 0.6, 0.65)
      });

      y -= 35;

      const drawSectionHeader = (label: string) => {
        y -= 10;
        page.drawText(label, {
          x: 50,
          y,
          size: 12,
          font: fontBold,
          color: template === 'traditional' ? rgb(0.5, 0.05, 0.1) : rgb(0.65, 0.45, 0.5)
        });
        
        y -= 4;
        page.drawLine({
          start: { x: 50, y },
          end: { x: 200, y },
          thickness: 0.75,
          color: template === 'traditional' ? rgb(0.85, 0.65, 0.15) : rgb(0.8, 0.6, 0.65)
        });
        y -= 18;
      };

      const drawRow = (label: string, value: string) => {
        if (!value) return;

        page.drawText(label, { x: 50, y, size: 9.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        
        // Dot leader dots
        const labelW = fontBold.widthOfTextAtSize(label, 9.5);
        const dotStart = 50 + labelW + 4;
        const dotEnd = 200;
        if (dotStart < dotEnd) {
          const dotCount = Math.floor((dotEnd - dotStart) / fontRegular.widthOfTextAtSize('.', 9.5));
          const dots = '.'.repeat(Math.max(1, dotCount));
          page.drawText(dots, { x: dotStart, y: y + 0.5, size: 9.5, font: fontRegular, color: rgb(0.7, 0.7, 0.7) });
        }

        // Draw Value (supporting line wrapping if value is very long, e.g. Address/Siblings)
        const wrappedVal = getWrappedLines(value, fontRegular, 9.5, 330);
        wrappedVal.forEach((line, idx) => {
          page.drawText(line, { x: 215, y: y - idx * 13, size: 9.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
        });

        y -= (wrappedVal.length * 13 + 5);
      };

      // 1. Personal Details Section
      drawSectionHeader('PERSONAL DETAILS');
      drawRow('Full Name', name);
      drawRow('Date of Birth', dob);
      drawRow('Time of Birth', tob);
      drawRow('Place of Birth', pob);
      drawRow('Height', height);
      drawRow('Gotra', gotra);
      drawRow('Rashi / Moon Sign', rashi);
      drawRow('Nakshatra', nakshatra);

      y -= 10;

      // 2. Education & Career Section
      drawSectionHeader('EDUCATION & CAREER');
      drawRow('Education Degree', education);
      drawRow('School/University', school);
      drawRow('Profession/Role', profession);
      drawRow('Company Name', company);
      drawRow('Annual Income', income);

      y -= 10;

      // 3. Family Details Section
      drawSectionHeader('FAMILY DETAILS');
      drawRow("Father's Name", father);
      drawRow("Mother's Name", mother);
      drawRow('Siblings', siblings);
      drawRow('Residential Address', address);
      drawRow('Contact Number', contact);

      setProgress(85);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error generating biodata PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearForm = () => {
    setName('');
    setDob('');
    setTob('');
    setPob('');
    setRashi('');
    setNakshatra('');
    setHeight('');
    setEducation('');
    setSchool('');
    setProfession('');
    setCompany('');
    setIncome('');
    setFather('');
    setMother('');
    setSiblings('');
    setGotra('');
    setContact('');
    setAddress('');
    setPdfBlobUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="marriage-biodata"
        title={t('tool.marriage.title')}
        description={t('tool.marriage.desc')}
        category="document"
        categoryName="Document Tools"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Editor Form Columns (5 cols) */}
        <div className="lg:col-span-5 space-y-6 max-h-[85vh] overflow-y-auto pr-2 pb-12">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Biodata Form Editor
            </h3>
            <button onClick={clearForm} className="text-[10px] text-red-500 hover:underline">
              Clear Inputs
            </button>
          </div>

          {/* Personal Info */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-3.5 shadow-sm text-xs font-semibold">
            <h4 className="font-heading text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">
              Personal & Astro Info
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
                <label>Date of Birth</label>
                <input
                  type="text"
                  value={dob}
                  onChange={(e) => { setDob(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>Time of Birth</label>
                <input
                  type="text"
                  value={tob}
                  onChange={(e) => { setTob(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Place of Birth</label>
                <input
                  type="text"
                  value={pob}
                  onChange={(e) => { setPob(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>Height (e.g. 5'4")</label>
                <input
                  type="text"
                  value={height}
                  onChange={(e) => { setHeight(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label>Gotra</label>
                <input
                  type="text"
                  value={gotra}
                  onChange={(e) => { setGotra(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-[11px] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>Rashi</label>
                <input
                  type="text"
                  value={rashi}
                  onChange={(e) => { setRashi(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-[11px] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>Nakshatra</label>
                <input
                  type="text"
                  value={nakshatra}
                  onChange={(e) => { setNakshatra(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-[11px] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Education & Career */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-3.5 shadow-sm text-xs font-semibold">
            <h4 className="font-heading text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">
              Education & Profession
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Degree</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => { setEducation(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>University / School</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => { setSchool(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Profession / Job</label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => { setProfession(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>Employer / Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => { setCompany(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label>Annual Income</label>
              <input
                type="text"
                value={income}
                onChange={(e) => { setIncome(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>
          </div>

          {/* Family & Contact Details */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-3.5 shadow-sm text-xs font-semibold">
            <h4 className="font-heading text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">
              Family & Contact Details
            </h4>

            <div className="space-y-1">
              <label>Father's Name & Details</label>
              <input
                type="text"
                value={father}
                onChange={(e) => { setFather(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Mother's Name & Details</label>
              <input
                type="text"
                value={mother}
                onChange={(e) => { setMother(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Siblings Details</label>
              <input
                type="text"
                value={siblings}
                onChange={(e) => { setSiblings(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Residential Address</label>
              <textarea
                value={address}
                onChange={(e) => { setAddress(e.target.value); setPdfBlobUrl(null); }}
                rows={2}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <label>Contact Info (Phone/Email)</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => { setContact(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live Preview & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Live Preview & Decorative Border Settings
            </h3>
          </div>

          {/* Template Configuration */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card flex flex-wrap gap-4 items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-3">
              <span>Theme:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setTemplate('traditional'); setPdfBlobUrl(null); }}
                  className={`px-3 py-1 rounded-md border text-[10px] ${
                    template === 'traditional'
                      ? 'border-brand-500 bg-brand-500/5 text-brand-650'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Traditional (Saffron / Maroon)
                </button>
                <button
                  onClick={() => { setTemplate('modern'); setPdfBlobUrl(null); }}
                  className={`px-3 py-1 rounded-md border text-[10px] ${
                    template === 'modern'
                      ? 'border-brand-500 bg-brand-500/5 text-brand-650'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Modern (Rose Gold)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span>Typography:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setFontFamily('serif'); setPdfBlobUrl(null); }}
                  className={`px-2.5 py-1 rounded text-[10px] ${
                    fontFamily === 'serif' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-850'
                  }`}
                >
                  Serif
                </button>
                <button
                  onClick={() => { setFontFamily('sans'); setPdfBlobUrl(null); }}
                  className={`px-2.5 py-1 rounded text-[10px] ${
                    fontFamily === 'sans' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-850'
                  }`}
                >
                  Sans-Serif
                </button>
              </div>
            </div>
          </div>

          {/* HTML Preview Frame */}
          <div
            className={`rounded-2xl border p-8 min-h-[500px] shadow-lg relative overflow-hidden transition-all duration-300 ${
              template === 'traditional'
                ? 'bg-[#fffdf9] border-red-800/25 text-red-950 font-serif'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Corner traditional decoration simulations */}
            {template === 'traditional' && (
              <>
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-600" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-600" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-600" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-600" />
                <div className="text-center text-[10px] font-bold text-red-750 uppercase tracking-widest mb-6">
                  || Shree Ganeshay Namah ||
                </div>
              </>
            )}

            <div className="text-center mb-6">
              <h2 className="font-heading text-xl font-bold tracking-widest uppercase">
                BIODATA
              </h2>
              <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-1" />
            </div>

            {/* Simulated dot leader rows */}
            <div className="space-y-4 text-xs font-semibold max-w-lg mx-auto">
              
              <div className="text-[10px] font-bold tracking-wider text-amber-600 uppercase border-b border-amber-500/10 pb-1 mt-4">
                Personal Information
              </div>

              {[
                { label: 'Full Name', val: name },
                { label: 'Date of Birth', val: dob },
                { label: 'Time of Birth', val: tob },
                { label: 'Place of Birth', val: pob },
                { label: 'Height', val: height },
                { label: 'Gotra', val: gotra },
                { label: 'Rashi', val: rashi },
                { label: 'Nakshatra', val: nakshatra }
              ].map((row, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4">
                  <span className="w-32 shrink-0">{row.label}</span>
                  <span className="text-slate-350 grow border-b border-dotted border-slate-300 mt-3 select-none" />
                  <span className="w-64 text-slate-700 dark:text-slate-300 font-normal">{row.val || '--'}</span>
                </div>
              ))}

              <div className="text-[10px] font-bold tracking-wider text-amber-600 uppercase border-b border-amber-500/10 pb-1 mt-4">
                Education & Career
              </div>

              {[
                { label: 'Degree', val: education },
                { label: 'University', val: school },
                { label: 'Profession', val: profession },
                { label: 'Employer', val: company },
                { label: 'Income', val: income }
              ].map((row, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4">
                  <span className="w-32 shrink-0">{row.label}</span>
                  <span className="text-slate-355 grow border-b border-dotted border-slate-300 mt-3 select-none" />
                  <span className="w-64 text-slate-700 dark:text-slate-300 font-normal">{row.val || '--'}</span>
                </div>
              ))}

              <div className="text-[10px] font-bold tracking-wider text-amber-600 uppercase border-b border-amber-500/10 pb-1 mt-4">
                Family & Contact details
              </div>

              {[
                { label: "Father's Name", val: father },
                { label: "Mother's Name", val: mother },
                { label: 'Siblings', val: siblings },
                { label: 'Residential Address', val: address },
                { label: 'Contact details', val: contact }
              ].map((row, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4">
                  <span className="w-32 shrink-0">{row.label}</span>
                  <span className="text-slate-360 grow border-b border-dotted border-slate-300 mt-3 select-none" />
                  <span className="w-64 text-slate-700 dark:text-slate-300 font-normal">{row.val || '--'}</span>
                </div>
              ))}

            </div>
          </div>

          {/* Compilation Actions */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-4">
            {isProcessing && <ProgressBar progress={progress} statusText="Compiling Biodata PDF..." />}

            {pdfBlobUrl ? (
              <div className="grid grid-cols-2 gap-4">
                <a
                  href={pdfBlobUrl}
                  download={`${name.replace(/\s+/g, '_')}_Marriage_Biodata.pdf`}
                  className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                >
                  <Download size={15} />
                  <span>Download Biodata PDF</span>
                </a>

                <button
                  onClick={() => {
                    const win = window.open(pdfBlobUrl);
                    win?.print();
                  }}
                  className="py-3 rounded-xl border border-slate-250 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Print Biodata</span>
                </button>
              </div>
            ) : (
              <button
                onClick={compilePdf}
                disabled={isProcessing}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-650/10 hover:scale-[1.01] transition-all"
              >
                <HeartHandshake size={15} />
                <span>Generate Biodata PDF</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* SEO Content & FAQ Section */}
      <SEOSection toolId="marriage-biodata" />
    </div>
  );
};

export default MarriageBiodata;
