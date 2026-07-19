import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { Download, Presentation, RefreshCw } from 'lucide-react';
import FileUpload from '../../components/shared/FileUpload';
import ToolHeader from '../../components/shared/ToolHeader';
import ProgressBar from '../../components/shared/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ConvertedPage {
  pageNumber: number;
  dataUrl: string;
  filename: string;
}

export const PdfToPpt: React.FC = () => {
  const { t } = useLanguage();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  
  const [pages, setPages] = useState<ConvertedPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [pptBlob, setPptBlob] = useState<Blob | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPdfFile(file);
    setPages([]);
    setPptBlob(null);
    
    const buffer = await file.arrayBuffer();
    setArrayBuffer(buffer);
  };
  const convertPdfToPpt = async () => {
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
        formData.append('output_format', 'pptx');

        setProgress(40);
        setLoadingText('Sending file to Supabase Edge Function (converting to editable PowerPoint)...');

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
        setLoadingText('Downloading PowerPoint presentation...');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${pdfFile.name.replace(/\.[^/.]+$/, "")}_converted.pptx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setProgress(100);
        setIsProcessing(false);
        return;

      } catch (err: any) {
        console.warn('Supabase native conversion failed, falling back to local slide generation:', err);
      }
    }

    setLoadingText('Loading PDF elements (local fallback)...');
    setProgress(20);
    setPages([]);
    setPptBlob(null);

    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const renderedPages: ConvertedPage[] = [];

      // Render PDF pages to images (High-Res 2.0x for presentation quality)
      const scale = 2.0;

      for (let i = 1; i <= numPages; i++) {
        setLoadingText(`Rendering page ${i} of ${numPages} to slide...`);
        setProgress(Math.round(10 + (40 * i) / numPages));

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context not available');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport, canvas }).promise;

        const dataUrl = canvas.toDataURL('image/png');
        renderedPages.push({
          pageNumber: i,
          dataUrl,
          filename: `slide_image_${i}.png`
        });
      }

      setPages(renderedPages);
      setLoadingText('Compiling PowerPoint package (.pptx)...');
      setProgress(60);

      // Package slides into a PPTX zip structure using JSZip
      const zip = new JSZip();

      // 1. _rels/.rels
      zip.file("_rels/.rels", `<?xml version="1.5" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

      // 2. [Content_Types].xml
      let slideOverrides = '';
      for (let i = 1; i <= numPages; i++) {
        slideOverrides += `  <Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n`;
      }

      zip.file("[Content_Types].xml", `<?xml version="1.5" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/xml/namespaces/markup-compatibility/2006">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
${slideOverrides}</Types>`);

      // 3. ppt/presentation.xml
      let slideIds = '';
      for (let i = 1; i <= numPages; i++) {
        slideIds += `    <p:sldId id="${255 + i}" r:id="rId${i}"/>\n`;
      }

      zip.file("ppt/presentation.xml", `<?xml version="1.5" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>
${slideIds}  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

      // 4. ppt/_rels/presentation.xml.rels
      let presentationRels = '';
      for (let i = 1; i <= numPages; i++) {
        presentationRels += `  <Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>\n`;
      }

      zip.file("ppt/_rels/presentation.xml.rels", `<?xml version="1.5" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/relationships">
${presentationRels}</Relationships>`);

      // 5. Build slide XML and media
      const mediaFolder = zip.folder("ppt/media");
      const slidesFolder = zip.folder("ppt/slides");
      const slidesRelsFolder = zip.folder("ppt/slides/_rels");

      for (let i = 0; i < renderedPages.length; i++) {
        const slideNum = i + 1;
        const page = renderedPages[i];

        // Save raw image data to media folder
        const imgData = page.dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
        mediaFolder?.file(`image${slideNum}.png`, imgData, { base64: true });

        // Save slide relationship reference
        slidesRelsFolder?.file(`slide${slideNum}.xml.rels`, `<?xml version="1.5" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${slideNum}.png"/>
</Relationships>`);

        // Save slide layout XML
        slidesFolder?.file(`slide${slideNum}.xml`, `<?xml version="1.5" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="2" name="Slide Background Image"/>
          <p:cNvPicPr>
            <a:picLocks noChangeAspect="1"/>
          </p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId1"/>
          <a:stretch>
            <a:fillRect/>
          </a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="9144000" cy="6858000"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`);
      }

      setProgress(85);
      setLoadingText('Bundling slide deck archive...');
      
      const zipBlob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
      setPptBlob(zipBlob);
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('Error converting PDF to slides.');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = () => {
    if (!pptBlob || !pdfFile) return;
    const url = URL.createObjectURL(pptBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${pdfFile.name.replace(/\.[^/.]+$/, "")}_slides.pptx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ToolHeader
        toolId="pdf-to-ppt"
        title={t('tool.pdfToPpt.title')}
        description={t('tool.pdfToPpt.desc')}
        category="pdf"
        categoryName="PDF Tools"
      />

      {!pdfFile ? (
        <div className="max-w-xl mx-auto mt-10">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            label="Upload PDF Document"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Workspace / Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250">
                PDF File: {pdfFile.name}
              </h3>
              
              <button
                onClick={() => {
                  setPdfFile(null);
                  setArrayBuffer(null);
                  setPages([]);
                  setPptBlob(null);
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

            {!isProcessing && pptBlob ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-6 shadow-sm flex flex-col items-center justify-center text-center py-16 animate-fade-in">
                <Presentation className="w-16 h-16 text-emerald-500 mb-4" />
                <h4 className="font-heading text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-2">
                  Presentation slides generated successfully!
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mb-8 leading-relaxed">
                  Your PDF pages have been converted to full-bleed landscape slides inside a valid `.pptx` PowerPoint presentation document.
                </p>
                
                <button
                  onClick={triggerDownload}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/10 transition-all hover:scale-[1.02]"
                >
                  <Download size={14} />
                  <span>Download PowerPoint (.pptx)</span>
                </button>
              </div>
            ) : (
              !isProcessing && pages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pages.map((p) => (
                    <div
                      key={p.pageNumber}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-3 shadow-sm flex flex-col justify-between"
                    >
                      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center relative group">
                        <img
                          src={p.dataUrl}
                          alt={`Slide ${p.pageNumber}`}
                          className="max-h-full max-w-full object-contain"
                        />
                        <div className="absolute top-2 left-2 bg-slate-900/80 text-white font-bold text-[9px] px-2 py-0.5 rounded">
                          Slide {p.pageNumber}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !isProcessing && (
                  <div className="py-24 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-card/50">
                    <Presentation className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-250">Slide Deck Compiling Pending</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Hit "Convert PDF to PowerPoint" below to compile high-resolution slides from each PDF page.
                    </p>
                  </div>
                )
              )
            )}
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
              <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <Presentation size={16} className="text-brand-500" />
                <span>Actions</span>
              </h3>

              {!pptBlob ? (
                <button
                  onClick={convertPdfToPpt}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.02]"
                >
                  <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                  <span>Convert PDF to PowerPoint</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={triggerDownload}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 transition-all"
                  >
                    <Download size={14} />
                    <span>Download PowerPoint (.pptx)</span>
                  </button>

                  <button
                    onClick={() => {
                      setPages([]);
                      setPptBlob(null);
                    }}
                    className="w-full py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-550 font-bold text-xs rounded-xl"
                  >
                    Reset Slide Generator
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfToPpt;
