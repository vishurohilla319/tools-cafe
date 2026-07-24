import React, { useState, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, FileText, Layers } from 'lucide-react';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import SEOSection from '../../components/shared/SEOSection';
import { useLanguage } from '../../context/LanguageContext';

interface LetterTemplate {
  id: string;
  name: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
}

const templatesList: LetterTemplate[] = [
  {
    id: 'leave',
    name: 'Leave Application (General/Sick)',
    subject: 'Application for Sick Leave',
    salutation: 'Respected Sir/Madam,',
    body: 'I am writing to formally request sick leave for 3 days starting from tomorrow due to a severe viral fever. My doctor has advised complete bed rest. I will ensure my pending tasks are coordinated with my team members during this absence. I request you to kindly grant me leave for the specified period.',
    closing: 'Yours faithfully,\nRahul Sharma'
  },
  {
    id: 'complaint',
    name: 'Complaint Letter (Public Service)',
    subject: 'Complaint Regarding Frequent Power Cuts in Adyar Area',
    salutation: 'Dear Sir/Madam,',
    body: 'I am writing to draw your urgent attention to the frequent and unscheduled electricity cuts in our neighborhood for the last two weeks. The power outages occur during the evening hours, causing extreme inconvenience to students preparing for examinations and senior citizens in this hot weather. We request you to kindly look into the matter and ensure stable power supply.',
    closing: 'Sincerely,\nResidents of Adyar'
  },
  {
    id: 'request',
    name: 'Request Letter (Service/Bank)',
    subject: 'Request for Issuance of New Cheque Book',
    salutation: 'The Branch Manager,',
    body: 'I hold a savings account in your branch with Account Number 109283746. I request you to kindly issue a new cheque book containing 50 leaves for my account as my current cheque book has been fully utilized. Please deliver the booklet to my registered address.',
    closing: 'Yours sincerely,\nRahul Sharma'
  },
  {
    id: 'business',
    name: 'Business Letter (General)',
    subject: 'Proposal for Annual Maintenance Service Partnership',
    salutation: 'Dear Partner,',
    body: 'We are pleased to submit our service proposal for the annual IT maintenance contract of your offices. Our team specializes in server monitoring, client computer setups, hardware replacements, and software licensing. We offer 24/7 dedicated remote and onsite support. Enclosed are our pricing structures and client testimonials for your kind review.',
    closing: 'Best regards,\nTools Cafe Solutions Ltd'
  }
];

export const ApplicationMaker: React.FC = () => {
  const { t } = useLanguage();

  // Active Template
  const [selectedTemplateId, setSelectedTemplateId] = useState('leave');
  
  // Fields State
  const [senderName, setSenderName] = useState('Rahul Sharma');
  const [senderAddr, setSenderAddr] = useState('Flat 12, Sunrise Society, Adyar, Chennai');
  const [recipient, setRecipient] = useState('The Principal,\nNational Public School,\nChennai');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  });
  const [subject, setSubject] = useState('');
  const [salutation, setSalutation] = useState('');
  const [body, setBody] = useState('');
  const [closing, setClosing] = useState('');

  // Sizing and Font Settings
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [fontSize, setFontSize] = useState<number>(10.5);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Sync fields when template changes
  useEffect(() => {
    const activeTemplate = templatesList.find((t) => t.id === selectedTemplateId);
    if (activeTemplate) {
      setSubject(activeTemplate.subject);
      setSalutation(activeTemplate.salutation);
      setBody(activeTemplate.body);
      setClosing(activeTemplate.closing);
      setPdfBlobUrl(null);
    }
  }, [selectedTemplateId]);

  // Helper to wrap lines
  const getWrappedLines = (text: string, font: any, size: number, maxWidth: number): string[] => {
    const paragraphs = text.split('\n');
    const resultLines: string[] = [];

    paragraphs.forEach((p) => {
      const words = p.split(' ');
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth) {
          resultLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) resultLines.push(currentLine);
      resultLines.push(''); // Add empty line space between paragraphs
    });

    // Remove trailing empty line
    if (resultLines[resultLines.length - 1] === '') {
      resultLines.pop();
    }

    return resultLines;
  };

  const compilePdf = async () => {
    setIsProcessing(true);
    setProgress(20);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.27, 841.89]); // A4 Size

      const isSerif = fontFamily === 'serif';
      const fontRegular = await pdfDoc.embedFont(isSerif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(isSerif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);

      setProgress(50);

      let y = 780;
      const marginX = 60;
      const contentWidth = 595.27 - marginX * 2; // 475.27 pt width

      const drawLines = (linesText: string, isBold = false) => {
        const lines = linesText.split('\n');
        lines.forEach((line) => {
          page.drawText(line, {
            x: marginX,
            y,
            size: fontSize,
            font: isBold ? fontBold : fontRegular,
            color: rgb(0.15, 0.15, 0.15)
          });
          y -= (fontSize + 4);
        });
      };

      // 1. Draw Sender Info
      if (senderName || senderAddr) {
        drawLines(`${senderName}\n${senderAddr}`);
        y -= 10;
      }

      // 2. Draw Date
      page.drawText(`Date: ${date}`, { x: marginX, y, size: fontSize, font: fontRegular });
      y -= (fontSize + 16);

      // 3. Draw Recipient Info
      if (recipient) {
        drawLines(recipient);
        y -= 15;
      }

      // 4. Draw Subject
      if (subject) {
        page.drawText('Subject: ', { x: marginX, y, size: fontSize, font: fontBold });
        const subjLabelWidth = fontBold.widthOfTextAtSize('Subject: ', fontSize);
        
        const wrappedSubject = getWrappedLines(subject, fontBold, fontSize, contentWidth - subjLabelWidth);
        wrappedSubject.forEach((line, idx) => {
          const drawX = idx === 0 ? marginX + subjLabelWidth : marginX;
          page.drawText(line, { x: drawX, y, size: fontSize, font: fontBold });
          y -= (fontSize + 4);
        });
        
        // Draw underline for subject
        y -= 2;
        page.drawLine({ start: { x: marginX, y }, end: { x: marginX + 475, y }, thickness: 0.5, color: rgb(0.2, 0.2, 0.2) });
        y -= 16;
      }

      // 5. Salutation
      if (salutation) {
        page.drawText(salutation, { x: marginX, y, size: fontSize, font: fontRegular });
        y -= (fontSize + 15);
      }

      // 6. Body Paragraphs (Line wrapping math)
      if (body) {
        const bodyLines = getWrappedLines(body, fontRegular, fontSize, contentWidth);
        bodyLines.forEach((line) => {
          if (line === '') {
            y -= 8; // small spacer between paragraphs
          } else {
            page.drawText(line, { x: marginX, y, size: fontSize, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
            y -= (fontSize + 4.5);
          }
        });
        y -= 20;
      }

      // 7. Closing & Signature
      if (closing) {
        drawLines(closing);
      }

      setProgress(85);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error building letter document PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="application-maker"
        title={t('tool.application.title')}
        description={t('tool.application.desc')}
        category="document"
        categoryName="Document Tools"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Form Fields (5 cols) */}
        <div className="lg:col-span-5 space-y-6 max-h-[85vh] overflow-y-auto pr-2 pb-12 text-xs font-semibold">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Letter Form Editor
            </h3>
            
            <div className="flex items-center gap-1 text-[10px] text-brand-600 font-bold">
              <Layers size={12} />
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="bg-transparent outline-none cursor-pointer"
              >
                {templatesList.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form details */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-3.5 shadow-sm">
            
            <div className="space-y-1">
              <label>Sender Full Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => { setSenderName(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Sender Address</label>
              <input
                type="text"
                value={senderAddr}
                onChange={(e) => { setSenderAddr(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Date of Application</label>
              <input
                type="text"
                value={date}
                onChange={(e) => { setDate(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Recipient Address / Designation (One line per row)</label>
              <textarea
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setPdfBlobUrl(null); }}
                rows={3}
                placeholder="The Principal,&#10;National High School,&#10;Chennai"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <label>Letter Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none font-bold"
              />
            </div>

            <div className="space-y-1">
              <label>Salutation (e.g. Dear Sir/Madam,)</label>
              <input
                type="text"
                value={salutation}
                onChange={(e) => { setSalutation(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Letter Body / Paragraphs</label>
              <textarea
                value={body}
                onChange={(e) => { setBody(e.target.value); setPdfBlobUrl(null); }}
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label>Closing & Signature block (One line per row)</label>
              <textarea
                value={closing}
                onChange={(e) => { setClosing(e.target.value); setPdfBlobUrl(null); }}
                rows={2}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 text-xs outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Live Preview & Typography controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Live Preview & Document Settings
            </h3>
          </div>

          {/* Typography Settings */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card flex flex-wrap gap-4 items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-3">
              <span>Typography:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setFontFamily('serif'); setPdfBlobUrl(null); }}
                  className={`px-3 py-1 rounded-md border text-[10px] ${
                    fontFamily === 'serif' ? 'border-brand-500 bg-brand-500/5 text-brand-650' : 'border-slate-250 hover:bg-slate-50'
                  }`}
                >
                  Serif (Formal)
                </button>
                <button
                  onClick={() => { setFontFamily('sans'); setPdfBlobUrl(null); }}
                  className={`px-3 py-1 rounded-md border text-[10px] ${
                    fontFamily === 'sans' ? 'border-brand-500 bg-brand-500/5 text-brand-650' : 'border-slate-250 hover:bg-slate-50'
                  }`}
                >
                  Sans-Serif (Clean)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span>Text Size:</span>
              <div className="flex gap-1.5">
                {[9.5, 10.5, 12].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => { setFontSize(sz); setPdfBlobUrl(null); }}
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      fontSize === sz ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-850 hover:bg-slate-200'
                    }`}
                  >
                    {sz === 9.5 ? 'Small' : sz === 12 ? 'Large' : 'Normal'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Simulated Page Frame */}
          <div
            className={`rounded-2xl border border-slate-200 bg-white text-slate-800 p-12 min-h-[550px] shadow-lg leading-relaxed relative ${
              fontFamily === 'serif' ? 'font-serif' : 'font-sans'
            }`}
            style={{ fontSize: `${fontSize + 1}px` }}
          >
            <div className="absolute top-2 right-2 text-[9px] font-bold text-slate-400 select-none">
              LIVE DOCUMENT PREVIEW
            </div>

            {/* Sender address */}
            <div className="text-slate-700">
              <div className="font-bold">{senderName || 'Sender Name'}</div>
              <div className="whitespace-pre-line text-slate-500 text-xs">{senderAddr}</div>
            </div>

            {/* Date */}
            <div className="mt-6 text-slate-600 text-xs">
              Date: {date}
            </div>

            {/* Recipient address */}
            <div className="mt-6 text-slate-750 text-xs whitespace-pre-line">
              {recipient || 'Recipient Designation & Address'}
            </div>

            {/* Subject */}
            {subject && (
              <div className="mt-6 font-bold text-xs underline decoration-slate-400">
                Subject: {subject}
              </div>
            )}

            {/* Salutation */}
            <div className="mt-6 text-slate-750 text-xs">
              {salutation || 'Dear Sir/Madam,'}
            </div>

            {/* Body */}
            <div className="mt-4 text-slate-800 text-xs whitespace-pre-line leading-relaxed">
              {body || 'Start writing your letter body contents...'}
            </div>

            {/* Closing */}
            <div className="mt-8 text-slate-700 text-xs whitespace-pre-line">
              {closing || 'Sincerely,\nYour Name'}
            </div>
          </div>

          {/* Action panels */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-4">
            {isProcessing && <ProgressBar progress={progress} statusText="Compiling Letter PDF..." />}

            {pdfBlobUrl ? (
              <div className="grid grid-cols-2 gap-4">
                <a
                  href={pdfBlobUrl}
                  download={`letter_${Date.now()}.pdf`}
                  className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                >
                  <Download size={15} />
                  <span>Download Letter PDF</span>
                </a>

                <button
                  onClick={() => {
                    const win = window.open(pdfBlobUrl);
                    win?.print();
                  }}
                  className="py-3 rounded-xl border border-slate-250 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Print Letter</span>
                </button>
              </div>
            ) : (
              <button
                onClick={compilePdf}
                disabled={isProcessing}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-650/10 hover:scale-[1.01] transition-all"
              >
                <FileText size={15} />
                <span>Generate Document PDF</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* SEO Content & FAQ Section */}
      <SEOSection toolId="application-maker" />
    </div>
  );
};

export default ApplicationMaker;
