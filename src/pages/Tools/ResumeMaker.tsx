import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, Plus, Trash2, Layout, FileUser, Eye } from 'lucide-react';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import SEOSection from '../../components/shared/SEOSection';
import { useLanguage } from '../../context/LanguageContext';

interface EducationItem {
  school: string;
  degree: string;
  year: string;
  desc: string;
}

interface ExperienceItem {
  company: string;
  role: string;
  duration: string;
  desc: string;
}



export const ResumeMaker: React.FC = () => {
  const { t } = useLanguage();

  // Personal Info Form
  const [name, setName] = useState('Rahul Sharma');
  const [title, setTitle] = useState('Senior Software Engineer');
  const [email, setEmail] = useState('rahul.sharma@email.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [address, setAddress] = useState('Mumbai, India');
  const [summary, setSummary] = useState(
    'Highly motivated software engineer with 5+ years of experience building scalable web applications. Passionate about React, Node.js, and browser-local performance optimizations.'
  );

  // Profile Photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoObj, setPhotoObj] = useState<HTMLImageElement | null>(null);

  // List arrays
  const [education, setEducation] = useState<EducationItem[]>([
    {
      school: 'IIT Bombay',
      degree: 'B.Tech in Computer Science',
      year: '2016 - 2020',
      desc: 'Graduated with Honours. Specialised in algorithms and system design.'
    }
  ]);

  const [experience, setExperience] = useState<ExperienceItem[]>([
    {
      company: 'Tech Solutions India',
      role: 'Software Developer',
      duration: '2020 - Present',
      desc: 'Lead a team of 4 front-end engineers. Reduced application load times by 40% using code splitting and client caching.'
    }
  ]);

  const [skills, setSkills] = useState<string[]>(['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS']);


  // Settings
  const [template, setTemplate] = useState<'minimalist' | 'creative'>('minimalist');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [fontFamily] = useState<'sans' | 'serif'>('sans');

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

  // List state modify handlers
  const addEducation = () => {
    setEducation((prev) => [...prev, { school: '', degree: '', year: '', desc: '' }]);
    setPdfBlobUrl(null);
  };

  const removeEducation = (idx: number) => {
    setEducation((prev) => prev.filter((_, i) => i !== idx));
    setPdfBlobUrl(null);
  };

  const handleEducationChange = (idx: number, field: keyof EducationItem, val: string) => {
    setEducation((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
    setPdfBlobUrl(null);
  };

  const addExperience = () => {
    setExperience((prev) => [...prev, { company: '', role: '', duration: '', desc: '' }]);
    setPdfBlobUrl(null);
  };

  const removeExperience = (idx: number) => {
    setExperience((prev) => prev.filter((_, i) => i !== idx));
    setPdfBlobUrl(null);
  };

  const handleExperienceChange = (idx: number, field: keyof ExperienceItem, val: string) => {
    setExperience((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
    setPdfBlobUrl(null);
  };



  const handleSkillChange = (idx: number, val: string) => {
    setSkills((prev) => prev.map((s, i) => (i === idx ? val : s)));
    setPdfBlobUrl(null);
  };

  const addSkill = () => {
    setSkills((prev) => [...prev, '']);
    setPdfBlobUrl(null);
  };

  const removeSkill = (idx: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== idx));
    setPdfBlobUrl(null);
  };

  // Helper to generate circular photo
  const getCircularPhotoBytes = (): Promise<Uint8Array | null> => {
    return new Promise((resolve) => {
      if (!photoObj) {
        resolve(null);
        return;
      }

      const size = 150;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.save();
      // Draw circular boundary path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      // Fit center of image
      const imgSize = Math.min(photoObj.width, photoObj.height);
      const startX = (photoObj.width - imgSize) / 2;
      const startY = (photoObj.height - imgSize) / 2;

      ctx.drawImage(photoObj, startX, startY, imgSize, imgSize, 0, 0, size, size);
      ctx.restore();

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
      if (currentLine) {
        resultLines.push(currentLine);
      }
    });

    return resultLines;
  };

  // Core PDF Builder
  const compilePdf = async () => {
    setIsProcessing(true);
    setProgress(15);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.27, 841.89]); // A4 Size

      // Embed fonts
      const isSerif = fontFamily === 'serif';
      const fontRegular = await pdfDoc.embedFont(isSerif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(isSerif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);

      setProgress(40);

      // Font size configuration constants
      let baseSize = 9.5;
      let headerSize = 18;
      let subHeaderSize = 12;
      if (fontSize === 'small') {
        baseSize = 8;
        headerSize = 15;
        subHeaderSize = 10.5;
      } else if (fontSize === 'large') {
        baseSize = 11;
        headerSize = 22;
        subHeaderSize = 14;
      }

      // Circular photo loading
      let embeddedPhoto = null;
      const photoBytes = await getCircularPhotoBytes();
      if (photoBytes) {
        embeddedPhoto = await pdfDoc.embedJpg(photoBytes);
      }

      setProgress(70);

      // Coordinate trackers
      let y = 790;

      if (template === 'minimalist') {
        // --- MINIMALIST TEMPLATE ---
        // Header
        page.drawText(name, { x: 50, y, size: headerSize, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        
        // Circular Photo on Right if uploaded
        if (embeddedPhoto) {
          page.drawImage(embeddedPhoto, { x: 485, y: y - 10, width: 60, height: 60 });
        }

        y -= (headerSize - 2);
        page.drawText(title, { x: 50, y, size: baseSize + 2, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
        
        y -= (baseSize + 8);
        // Contact details row
        const contactString = `${email}  |  ${phone}  |  ${address}`;
        page.drawText(contactString, { x: 50, y, size: baseSize - 1, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });

        // Separation line
        y -= 10;
        page.drawLine({
          start: { x: 50, y },
          end: { x: 545, y },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8)
        });
        y -= 20;

        // Professional Summary
        if (summary) {
          page.drawText('PROFESSIONAL SUMMARY', { x: 50, y, size: subHeaderSize, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
          y -= 15;
          const summaryLines = getWrappedLines(summary, fontRegular, baseSize, 495);
          summaryLines.forEach((line) => {
            page.drawText(line, { x: 50, y, size: baseSize, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
            y -= (baseSize + 3.5);
          });
          y -= 10;
        }

        // Professional Experience
        if (experience.length > 0) {
          page.drawText('WORK EXPERIENCE', { x: 50, y, size: subHeaderSize, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
          y -= 8;
          page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.25, color: rgb(0.85, 0.85, 0.85) });
          y -= 18;

          experience.forEach((job) => {
            if (!job.company) return;
            page.drawText(job.role, { x: 50, y, size: baseSize + 0.5, font: fontBold, color: rgb(0.25, 0.25, 0.25) });
            page.drawText(job.duration, { x: 450, y, size: baseSize - 1, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
            y -= (baseSize + 3);

            page.drawText(job.company, { x: 50, y, size: baseSize, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
            y -= (baseSize + 6);

            const descLines = getWrappedLines(job.desc, fontRegular, baseSize - 0.5, 495);
            descLines.forEach((line) => {
              page.drawText('• ' + line, { x: 55, y, size: baseSize - 0.5, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
              y -= (baseSize + 3);
            });
            y -= 12;
          });
        }

        // Education
        if (education.length > 0) {
          page.drawText('EDUCATION', { x: 50, y, size: subHeaderSize, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
          y -= 8;
          page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.25, color: rgb(0.85, 0.85, 0.85) });
          y -= 18;

          education.forEach((edu) => {
            if (!edu.school) return;
            page.drawText(edu.degree, { x: 50, y, size: baseSize + 0.5, font: fontBold, color: rgb(0.25, 0.25, 0.25) });
            page.drawText(edu.year, { x: 450, y, size: baseSize - 1, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
            y -= (baseSize + 3);

            page.drawText(edu.school, { x: 50, y, size: baseSize, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
            y -= (baseSize + 6);

            if (edu.desc) {
              const descLines = getWrappedLines(edu.desc, fontRegular, baseSize - 0.5, 495);
              descLines.forEach((line) => {
                page.drawText(line, { x: 50, y, size: baseSize - 0.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
                y -= (baseSize + 3);
              });
            }
            y -= 10;
          });
        }

        // Skills (Single row CSV style)
        if (skills.length > 0 && skills[0] !== '') {
          page.drawText('SKILLS', { x: 50, y, size: subHeaderSize, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
          y -= 8;
          page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.25, color: rgb(0.85, 0.85, 0.85) });
          y -= 18;

          const skillsText = skills.filter((s) => s !== '').join(', ');
          const skillsLines = getWrappedLines(skillsText, fontRegular, baseSize, 495);
          skillsLines.forEach((line) => {
            page.drawText(line, { x: 50, y, size: baseSize, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
            y -= (baseSize + 4);
          });
        }

      } else {
        // --- CREATIVE TEMPLATE (Left navy sidebar) ---
        // Draw Left sidebar rect
        page.drawRectangle({
          x: 0,
          y: 0,
          width: 175,
          height: 841.89,
          color: rgb(0.08, 0.12, 0.22)
        });

        // Sidebar photo
        if (embeddedPhoto) {
          page.drawImage(embeddedPhoto, { x: 47, y: 700, width: 80, height: 80 });
        }

        // Contact info in sidebar
        let sy = 650;
        page.drawText('CONTACT INFO', { x: 25, y: sy, size: baseSize + 1, font: fontBold, color: rgb(1, 1, 1) });
        sy -= 16;
        
        const drawContact = (label: string, value: string) => {
          if (!value) return;
          page.drawText(label, { x: 25, y: sy, size: baseSize - 2, font: fontBold, color: rgb(0.6, 0.7, 0.9) });
          sy -= 10;
          page.drawText(value, { x: 25, y: sy, size: baseSize - 1, font: fontRegular, color: rgb(0.9, 0.9, 0.9) });
          sy -= 18;
        };

        drawContact('EMAIL', email);
        drawContact('PHONE', phone);
        drawContact('LOCATION', address);

        // Skills in sidebar
        sy -= 10;
        page.drawText('KEY SKILLS', { x: 25, y: sy, size: baseSize + 1, font: fontBold, color: rgb(1, 1, 1) });
        sy -= 15;

        skills.forEach((s) => {
          if (!s) return;
          page.drawText('• ' + s, { x: 25, y: sy, size: baseSize - 0.5, font: fontRegular, color: rgb(0.9, 0.9, 0.9) });
          sy -= (baseSize + 4);
        });

        // Right side main content (starts at x = 200 pt)
        let rx = 200;
        y = 770;

        page.drawText(name, { x: rx, y, size: headerSize + 2, font: fontBold, color: rgb(0.08, 0.12, 0.22) });
        y -= (headerSize);
        page.drawText(title, { x: rx, y, size: baseSize + 2.5, font: fontRegular, color: rgb(0.4, 0.5, 0.7) });

        y -= (baseSize + 25);
        if (summary) {
          page.drawText('SUMMARY', { x: rx, y, size: subHeaderSize, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
          y -= 14;
          const sumLines = getWrappedLines(summary, fontRegular, baseSize, 345);
          sumLines.forEach((line) => {
            page.drawText(line, { x: rx, y, size: baseSize, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
            y -= (baseSize + 3.5);
          });
          y -= 18;
        }

        if (experience.length > 0) {
          page.drawText('WORK EXPERIENCE', { x: rx, y, size: subHeaderSize, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
          y -= 6;
          page.drawLine({ start: { x: rx, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
          y -= 18;

          experience.forEach((job) => {
            if (!job.company) return;
            page.drawText(job.role, { x: rx, y, size: baseSize + 0.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
            page.drawText(job.duration, { x: 450, y, size: baseSize - 1, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
            y -= (baseSize + 3);

            page.drawText(job.company, { x: rx, y, size: baseSize, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
            y -= (baseSize + 6);

            const jobLines = getWrappedLines(job.desc, fontRegular, baseSize - 0.5, 345);
            jobLines.forEach((line) => {
              page.drawText('• ' + line, { x: rx + 5, y, size: baseSize - 0.5, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
              y -= (baseSize + 3);
            });
            y -= 14;
          });
        }

        if (education.length > 0) {
          page.drawText('EDUCATION', { x: rx, y, size: subHeaderSize, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
          y -= 6;
          page.drawLine({ start: { x: rx, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
          y -= 18;

          education.forEach((edu) => {
            if (!edu.school) return;
            page.drawText(edu.degree, { x: rx, y, size: baseSize + 0.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
            page.drawText(edu.year, { x: 450, y, size: baseSize - 1, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
            y -= (baseSize + 3);

            page.drawText(edu.school, { x: rx, y, size: baseSize, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
            y -= (baseSize + 6);

            if (edu.desc) {
              const eduLines = getWrappedLines(edu.desc, fontRegular, baseSize - 0.5, 345);
              eduLines.forEach((line) => {
                page.drawText(line, { x: rx, y, size: baseSize - 0.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
                y -= (baseSize + 3);
              });
            }
            y -= 10;
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
      alert('Error compiling resume PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearForm = () => {
    setName('');
    setTitle('');
    setEmail('');
    setPhone('');
    setAddress('');
    setSummary('');
    setEducation([]);
    setExperience([]);
    setSkills([]);
    setPhotoUrl(null);
    setPhotoObj(null);
    setPdfBlobUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="resume-maker"
        title={t('tool.resume.title')}
        description={t('tool.resume.desc')}
        category="document"
        categoryName="Document Tools"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Form Editor (cols 5) */}
        <div className="lg:col-span-5 space-y-6 max-h-[85vh] overflow-y-auto pr-2 pb-12">
          
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Resume Form Fields
            </h3>
            <button onClick={clearForm} className="text-[10px] text-red-500 hover:underline">
              Clear Form
            </button>
          </div>

          {/* Personal details Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-3.5 shadow-sm text-xs font-semibold">
            <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Personal Information
            </h4>
            
            <div className="space-y-1">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label>Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label>Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPdfBlobUrl(null); }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label>Location / Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setPdfBlobUrl(null); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
              />
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

            <div className="space-y-1">
              <label>Professional Summary</label>
              <textarea
                value={summary}
                onChange={(e) => { setSummary(e.target.value); setPdfBlobUrl(null); }}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Work Experience */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-4 shadow-sm text-xs font-semibold">
            <div className="flex justify-between items-center">
              <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Work Experience
              </h4>
              <button
                onClick={addExperience}
                className="text-[10px] text-brand-600 hover:underline flex items-center gap-1 font-bold"
              >
                <Plus size={12} />
                <span>Add Item</span>
              </button>
            </div>

            {experience.map((job, idx) => (
              <div key={idx} className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl space-y-2.5 relative bg-slate-50/20 dark:bg-slate-900/10">
                <button
                  onClick={() => removeExperience(idx)}
                  className="absolute top-2 right-2 text-slate-350 hover:text-red-500"
                  title="Remove Job"
                >
                  <Trash2 size={12} />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label>Company</label>
                    <input
                      type="text"
                      value={job.company}
                      onChange={(e) => handleExperienceChange(idx, 'company', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-card focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Role</label>
                    <input
                      type="text"
                      value={job.role}
                      onChange={(e) => handleExperienceChange(idx, 'role', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-card focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Duration (e.g. 2020 - 2022)</label>
                  <input
                    type="text"
                    value={job.duration}
                    onChange={(e) => handleExperienceChange(idx, 'duration', e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-card focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label>Description / Achievements</label>
                  <textarea
                    value={job.desc}
                    onChange={(e) => handleExperienceChange(idx, 'desc', e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 rounded border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-card focus:outline-none resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Education Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-4 shadow-sm text-xs font-semibold">
            <div className="flex justify-between items-center">
              <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Education
              </h4>
              <button
                onClick={addEducation}
                className="text-[10px] text-brand-600 hover:underline flex items-center gap-1 font-bold"
              >
                <Plus size={12} />
                <span>Add Item</span>
              </button>
            </div>

            {education.map((edu, idx) => (
              <div key={idx} className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl space-y-2.5 relative bg-slate-50/20 dark:bg-slate-900/10">
                <button
                  onClick={() => removeEducation(idx)}
                  className="absolute top-2 right-2 text-slate-350 hover:text-red-500"
                  title="Remove Education"
                >
                  <Trash2 size={12} />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label>School / University</label>
                    <input
                      type="text"
                      value={edu.school}
                      onChange={(e) => handleEducationChange(idx, 'school', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-card focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Degree</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-card focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label>Year / Duration</label>
                    <input
                      type="text"
                      value={edu.year}
                      onChange={(e) => handleEducationChange(idx, 'year', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-card focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Brief Description (Optional)</label>
                    <input
                      type="text"
                      value={edu.desc}
                      onChange={(e) => handleEducationChange(idx, 'desc', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-250 dark:border-slate-800 bg-white dark:bg-dark-card focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Skills Grid */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card space-y-4 shadow-sm text-xs font-semibold">
            <div className="flex justify-between items-center">
              <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Skills List
              </h4>
              <button
                onClick={addSkill}
                className="text-[10px] text-brand-600 hover:underline flex items-center gap-1 font-bold"
              >
                <Plus size={12} />
                <span>Add Skill</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {skills.map((skill, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => handleSkillChange(idx, e.target.value)}
                    className="w-20 bg-transparent text-[11px] outline-none"
                  />
                  <button onClick={() => removeSkill(idx)} className="text-slate-350 hover:text-red-500">
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Live Preview (cols 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Live Preview & Template Settings
            </h3>
          </div>

          {/* Top Panel Controls */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card flex flex-wrap gap-4 items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-3">
              <Layout size={14} className="text-brand-500" />
              <span>Template:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setTemplate('minimalist'); setPdfBlobUrl(null); }}
                  className={`px-3 py-1 rounded-md border text-[10px] ${
                    template === 'minimalist'
                      ? 'border-brand-500 bg-brand-500/5 text-brand-650'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Minimalist
                </button>
                <button
                  onClick={() => { setTemplate('creative'); setPdfBlobUrl(null); }}
                  className={`px-3 py-1 rounded-md border text-[10px] ${
                    template === 'creative'
                      ? 'border-brand-500 bg-brand-500/5 text-brand-650'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Creative
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span>Font Size:</span>
              <div className="flex gap-1.5">
                {['small', 'medium', 'large'].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setFontSize(s as any); setPdfBlobUrl(null); }}
                    className={`px-2 py-0.5 rounded capitalize text-[10px] ${
                      fontSize === s ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-850 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Simulated HTML Preview Pane */}
          <div className="rounded-2xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#0c0d15] p-8 min-h-[500px] shadow-lg text-slate-800 dark:text-slate-200 overflow-x-auto relative">
            <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] font-bold text-slate-400 select-none">
              <Eye size={12} />
              <span>LIVE DOCUMENT PREVIEW</span>
            </div>

            {template === 'minimalist' ? (
              // Minimalist Preview
              <div className={`space-y-6 ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`} style={{ fontSize: fontSize === 'small' ? '12px' : fontSize === 'large' ? '16px' : '14px' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                      {name || 'YOUR NAME'}
                    </h2>
                    <div className="text-brand-600 dark:text-brand-450 font-bold mt-2">
                      {title || 'Professional Title'}
                    </div>
                    <div className="text-slate-450 dark:text-slate-400 text-xs mt-2 flex flex-wrap gap-2">
                      <span>{email}</span>
                      <span>•</span>
                      <span>{phone}</span>
                      <span>•</span>
                      <span>{address}</span>
                    </div>
                  </div>

                  {photoUrl && (
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                    />
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 my-4" />

                {summary && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-855 dark:text-slate-100">
                      Professional Summary
                    </h3>
                    <p className="text-slate-550 dark:text-slate-350 leading-relaxed text-xs">
                      {summary}
                    </p>
                  </div>
                )}

                {experience.length > 0 && experience[0].company !== '' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-855 dark:text-slate-100">
                      Work Experience
                    </h3>
                    <div className="space-y-4">
                      {experience.map((job, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between font-bold text-slate-900 dark:text-white text-xs">
                            <span>{job.role || 'Role Name'}</span>
                            <span className="text-slate-400 font-normal">{job.duration}</span>
                          </div>
                          <div className="text-brand-600/80 dark:text-brand-400 text-xs font-semibold">
                            {job.company || 'Company Name'}
                          </div>
                          <p className="text-slate-550 dark:text-slate-350 leading-relaxed text-xs">
                            {job.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {education.length > 0 && education[0].school !== '' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-855 dark:text-slate-100">
                      Education
                    </h3>
                    <div className="space-y-3">
                      {education.map((edu, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between font-bold text-slate-900 dark:text-white text-xs">
                            <span>{edu.degree || 'Degree Name'}</span>
                            <span className="text-slate-400 font-normal">{edu.year}</span>
                          </div>
                          <div className="text-slate-450 dark:text-slate-400 text-xs font-semibold">
                            {edu.school || 'School Name'}
                          </div>
                          {edu.desc && <p className="text-slate-500 text-xs mt-1">{edu.desc}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {skills.length > 0 && skills[0] !== '' && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-855 dark:text-slate-100">
                      Skills
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                      {skills.filter((s) => s !== '').join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Creative Preview (Left Sidebar Layout)
              <div className={`grid grid-cols-12 gap-6 ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`} style={{ fontSize: fontSize === 'small' ? '12px' : fontSize === 'large' ? '16px' : '14px' }}>
                {/* Left sidebar col 4 */}
                <div className="col-span-4 bg-slate-900 dark:bg-slate-950 p-4 rounded-xl -m-4 text-white space-y-6">
                  {photoUrl && (
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-2 border-white/20 mx-auto shadow-sm"
                    />
                  )}

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-350">
                        Contact Details
                      </h4>
                      <div className="mt-2 space-y-2 text-[10px] text-slate-300 font-medium">
                        {email && <div className="truncate">Email: {email}</div>}
                        {phone && <div>Phone: {phone}</div>}
                        {address && <div>Location: {address}</div>}
                      </div>
                    </div>

                    {skills.length > 0 && skills[0] !== '' && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-350">
                          Skills
                        </h4>
                        <ul className="mt-2 space-y-1 text-[10px] text-slate-300">
                          {skills.filter((s) => s !== '').map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>


                {/* Right side main content col 8 */}
                <div className="col-span-8 space-y-6">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                      {name || 'YOUR NAME'}
                    </h2>
                    <div className="text-brand-600 dark:text-brand-450 font-bold mt-2">
                      {title || 'Professional Title'}
                    </div>
                  </div>

                  {summary && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        Professional Summary
                      </h3>
                      <p className="text-slate-550 dark:text-slate-350 leading-relaxed text-xs">
                        {summary}
                      </p>
                    </div>
                  )}

                  {experience.length > 0 && experience[0].company !== '' && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        Experience
                      </h3>
                      <div className="space-y-3">
                        {experience.map((job, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between font-bold text-slate-900 dark:text-white text-xs">
                              <span>{job.role || 'Role Name'}</span>
                              <span className="text-slate-400 font-normal">{job.duration}</span>
                            </div>
                            <div className="text-brand-650 dark:text-brand-400 text-xs font-semibold">
                              {job.company || 'Company Name'}
                            </div>
                            <p className="text-slate-500 text-xs mt-1">{job.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {education.length > 0 && education[0].school !== '' && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        Education
                      </h3>
                      <div className="space-y-3">
                        {education.map((edu, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between font-bold text-slate-900 dark:text-white text-xs">
                              <span>{edu.degree || 'Degree Name'}</span>
                              <span className="text-slate-400 font-normal">{edu.year}</span>
                            </div>
                            <div className="text-slate-450 dark:text-slate-400 text-xs font-semibold">
                              {edu.school || 'School Name'}
                            </div>
                            {edu.desc && <p className="text-slate-500 text-xs mt-1">{edu.desc}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Render and download action panels */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm space-y-4">
            {isProcessing && <ProgressBar progress={progress} statusText="Compiling PDF..." />}

            {pdfBlobUrl ? (
              <div className="grid grid-cols-2 gap-4">
                <a
                  href={pdfBlobUrl}
                  download={`${name.replace(/\s+/g, '_')}_Resume.pdf`}
                  className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-550/10 transition-all hover:scale-[1.02]"
                >
                  <Download size={15} />
                  <span>Download Resume PDF</span>
                </a>

                <button
                  onClick={() => {
                    const win = window.open(pdfBlobUrl);
                    win?.print();
                  }}
                  className="py-3 rounded-xl border border-slate-250 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Print Resume</span>
                </button>
              </div>
            ) : (
              <button
                onClick={compilePdf}
                disabled={isProcessing}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-650/10 hover:scale-[1.01] transition-all"
              >
                <FileUser size={15} />
                <span>Generate Resume PDF</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* SEO Content & FAQ Section */}
      <SEOSection toolId="resume-maker" />
    </div>
  );
};

export default ResumeMaker;
