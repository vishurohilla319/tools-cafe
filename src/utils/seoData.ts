export interface FAQItem {
  question: string;
  answer: string;
}

export interface StepItem {
  title: string;
  description: string;
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  category?: string;
  categoryName?: string;
  faqs?: FAQItem[];
  steps?: StepItem[];
  schemaType?: 'WebApplication' | 'SoftwareApplication' | 'WebPage' | 'Website';
}

export const SITE_NAME = 'Tools Cafe';
export const getSiteUrl = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://toolscafe.com';
};
export const SITE_URL = getSiteUrl();
export const DEFAULT_OG_IMAGE = `${getSiteUrl()}/og-image.png`;

export const seoDataMap: Record<string, SEOMetadata> = {
  // Main Pages
  '/': {
    title: 'Tools Cafe - 100% Free & Private Online PDF, Image & Utility Tools',
    description: 'All-in-one suite of 100% private, client-side digital tools. Convert JPG to PDF, merge PDFs, edit PDF, compress images, generate QR codes, create resumes & passport photos with zero server uploads.',
    keywords: [
      'tools cafe',
      'online pdf tools',
      'free image converter',
      'privacy focused tools',
      'client side pdf editor',
      'convert jpg to pdf',
      'merge pdf free',
      'passport photo maker',
      'resume builder online'
    ],
    canonical: `${SITE_URL}/`,
    schemaType: 'Website',
    faqs: [
      {
        question: 'Are my files safe on Tools Cafe?',
        answer: 'Yes, 100% safe. Tools Cafe processes your files entirely inside your web browser using WebAssembly and client-side JavaScript. Your files are never uploaded to any remote server.'
      },
      {
        question: 'Is Tools Cafe free to use?',
        answer: 'Yes! All core tools on Tools Cafe are 100% free with generous usage limits and no hidden subscriptions.'
      },
      {
        question: 'Do I need to install any software or extensions?',
        answer: 'No installation is needed. All tools run directly inside your modern web browser on Desktop, Tablet, or Mobile.'
      },
      {
        question: 'Can I use Tools Cafe offline?',
        answer: 'Yes, once the application loads in your browser, most tools work completely offline without an active internet connection.'
      }
    ]
  },
  '/tools': {
    title: 'All Web Tools Directory - Free PDF, Image & Document Utilities | Tools Cafe',
    description: 'Explore the complete directory of free online tools at Tools Cafe. Convert, compress, edit, format, and generate PDFs, images, resumes, QR codes, and passport photos effortlessly.',
    keywords: [
      'all pdf tools',
      'online utilities directory',
      'image tools collection',
      'document converters list',
      'free web tools'
    ],
    canonical: `${SITE_URL}/tools`,
    schemaType: 'WebPage'
  },
  '/pricing': {
    title: 'Pricing & Plans - Free & Pro Subscriptions | Tools Cafe',
    description: 'Simple, transparent pricing for Tools Cafe. Enjoy generous free access or upgrade to Pro for unlimited batch processing and premium document creation tools.',
    keywords: ['tools cafe pricing', 'pro subscription', 'free online tools tier', 'pdf tools plans'],
    canonical: `${SITE_URL}/pricing`,
    schemaType: 'WebPage'
  },

  // PDF Tools
  '/tools/jpg-to-pdf': {
    title: 'Convert JPG to PDF Online - Free & 100% Private | Tools Cafe',
    description: 'Convert JPG, JPEG, and PNG images into a clean, formatted PDF document instantly. Adjust page orientation, margin, and size with zero server uploads.',
    keywords: ['jpg to pdf', 'convert jpg to pdf', 'jpeg to pdf online', 'image to pdf converter', 'free jpg to pdf'],
    canonical: `${SITE_URL}/tools/jpg-to-pdf`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Upload JPG Images', description: 'Drag and drop or choose JPG/PNG images from your device.' },
      { title: 'Customize Layout', description: 'Reorder images, select page size (A4, Letter), orientation, and margins.' },
      { title: 'Download PDF', description: 'Click Convert to compile and download your PDF instantly in your browser.' }
    ],
    faqs: [
      {
        question: 'How do I convert JPG to PDF for free?',
        answer: 'Upload your JPG images into our free online converter, adjust page settings if needed, and click Download PDF. Processing takes seconds and stays 100% in your browser.'
      },
      {
        question: 'Can I combine multiple JPG images into one single PDF?',
        answer: 'Yes! You can select multiple images, reorder them via drag and drop, and merge them into a single PDF document.'
      },
      {
        question: 'Is there any quality loss when converting JPG to PDF?',
        answer: 'No, Tools Cafe preserves original image resolution and clarity while building your high-definition PDF.'
      }
    ]
  },
  '/tools/png-to-pdf': {
    title: 'Convert PNG to PDF Online - Free & High Resolution | Tools Cafe',
    description: 'Easily convert transparent PNG images to PDF files online. Free, fast, and 100% secure client-side browser processing.',
    keywords: ['png to pdf', 'convert png to pdf', 'png image to pdf', 'free png to pdf online'],
    canonical: `${SITE_URL}/tools/png-to-pdf`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Select PNG Files', description: 'Choose one or multiple PNG image files from your folder.' },
      { title: 'Adjust Settings', description: 'Set page dimensions, orientation, and layout options.' },
      { title: 'Generate PDF', description: 'Click Convert to save your PNGs as a multi-page PDF document.' }
    ],
    faqs: [
      {
        question: 'Does PNG transparency remain visible in PDF?',
        answer: 'Yes, PNG transparent backgrounds are neatly rendered onto clean white document pages.'
      }
    ]
  },
  '/tools/merge-pdf': {
    title: 'Merge PDF Files Online - Combine Multiple PDFs Free | Tools Cafe',
    description: 'Combine two or more PDF files into a single structured document. Drag to reorder pages, rotate, and download your merged PDF in seconds.',
    keywords: ['merge pdf', 'combine pdf files', 'join pdf online', 'pdf merger free', 'combine pdf documents'],
    canonical: `${SITE_URL}/tools/merge-pdf`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Upload PDF Files', description: 'Select two or more PDF documents to merge.' },
      { title: 'Arrange Order', description: 'Drag and drop file cards to arrange the exact sequence of pages.' },
      { title: 'Merge & Save', description: 'Click Merge PDF to produce your unified PDF file instantly.' }
    ],
    faqs: [
      {
        question: 'Is there a limit on how many PDF files I can merge?',
        answer: 'You can merge dozens of PDF files at once directly in your browser without file size caps.'
      },
      {
        question: 'Are my PDF contents uploaded to servers?',
        answer: 'No! PDF merging takes place entirely within your browser memory (RAM), keeping your data 100% confidential.'
      }
    ]
  },
  '/tools/merge-jpg-pdf': {
    title: 'Merge JPG & PDF Files Together Online - Free Tool | Tools Cafe',
    description: 'Combine JPG images and PDF documents together into a single unified PDF file. Reorder pages seamlessly with zero server uploads.',
    keywords: ['merge jpg and pdf', 'combine image and pdf', 'join jpg pdf', 'merge photos and pdf'],
    canonical: `${SITE_URL}/tools/merge-jpg-pdf`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Add JPGs & PDFs', description: 'Choose both image files (JPG, PNG) and existing PDF files.' },
      { title: 'Reorder Items', description: 'Arrange pages in your preferred visual order.' },
      { title: 'Download Combined PDF', description: 'Export your combined document instantly.' }
    ],
    faqs: [
      {
        question: 'Can I mix JPG photos and existing PDFs in one document?',
        answer: 'Yes! This tool seamlessly converts images into PDF pages and appends existing PDF pages together.'
      }
    ]
  },
  '/tools/delete-pdf-pages': {
    title: 'Delete PDF Pages Online - Remove Pages from PDF Free | Tools Cafe',
    description: 'Remove unwanted, blank, or duplicate pages from any PDF document online. Quick thumbnail preview and instant page deletion.',
    keywords: ['delete pdf pages', 'remove pages from pdf', 'pdf page remover', 'delete specific pdf page'],
    canonical: `${SITE_URL}/tools/delete-pdf-pages`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Open PDF', description: 'Upload the PDF document you want to trim.' },
      { title: 'Select Pages to Remove', description: 'Click page thumbnails or enter page numbers to delete.' },
      { title: 'Download Updated PDF', description: 'Save your cleaned PDF file without the deleted pages.' }
    ],
    faqs: [
      {
        question: 'Can I select specific page ranges to delete?',
        answer: 'Yes, you can click visual page thumbnails or type custom page ranges like 1, 3-5, 8.'
      }
    ]
  },
  '/tools/pdf-to-jpg': {
    title: 'Convert PDF to JPG Images - High Resolution & Free | Tools Cafe',
    description: 'Extract every page of your PDF into high-quality JPG or PNG images. Fast zip download with 100% privacy assurance.',
    keywords: ['pdf to jpg', 'convert pdf to image', 'pdf to jpeg converter', 'extract images from pdf'],
    canonical: `${SITE_URL}/tools/pdf-to-jpg`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Upload PDF', description: 'Select the PDF file you wish to extract images from.' },
      { title: 'Choose Quality', description: 'Select image resolution and output format (JPG or PNG).' },
      { title: 'Download Images', description: 'Download individual page images or a complete ZIP archive.' }
    ],
    faqs: [
      {
        question: 'What image quality is rendered from the PDF?',
        answer: 'Pages are rendered at high DPI (up to 300 DPI) for crisp text and sharp visuals.'
      }
    ]
  },
  '/tools/pdf-editor': {
    title: 'Edit PDF Online - Add Text, Images & Annotations Free | Tools Cafe',
    description: 'Free online browser PDF editor. Insert custom text, add images, sign documents, add shapes, and save edited PDFs securely.',
    keywords: ['edit pdf online', 'pdf editor free', 'add text to pdf', 'sign pdf online', 'insert image into pdf'],
    canonical: `${SITE_URL}/tools/pdf-editor`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Load PDF File', description: 'Upload the PDF document you want to edit.' },
      { title: 'Annotate & Modify', description: 'Add text blocks, stamps, electronic signatures, or logo images.' },
      { title: 'Export PDF', description: 'Save and download your newly edited PDF document.' }
    ],
    faqs: [
      {
        question: 'Can I add electronic signatures to my PDF?',
        answer: 'Yes! Draw or upload your signature and position it anywhere on your document.'
      }
    ]
  },
  '/tools/compress-pdf': {
    title: 'Compress PDF Online - Reduce PDF File Size Free | Tools Cafe',
    description: 'Compress large PDF files to optimize storage and email sharing without compromising readable text quality.',
    keywords: ['compress pdf', 'reduce pdf size', 'shrink pdf file', 'pdf compressor online free'],
    canonical: `${SITE_URL}/tools/compress-pdf`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Select Large PDF', description: 'Choose the PDF document that needs size reduction.' },
      { title: 'Choose Compression Level', description: 'Select standard, medium, or high compression ratio.' },
      { title: 'Download Compressed PDF', description: 'Save the lightweight PDF instantly.' }
    ],
    faqs: [
      {
        question: 'How much can I reduce my PDF size?',
        answer: 'Depending on the image contents, file sizes can often be reduced by 40% to 80%.'
      }
    ]
  },
  '/tools/word-to-pdf': {
    title: 'Convert Word to PDF Online - DOCX to PDF Free | Tools Cafe',
    description: 'Convert DOC and DOCX Word documents into professional, print-ready PDF files directly in your web browser.',
    keywords: ['word to pdf', 'docx to pdf', 'convert doc to pdf', 'word document to pdf online'],
    canonical: `${SITE_URL}/tools/word-to-pdf`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Upload Word Document', description: 'Select your .docx file from your computer or phone.' },
      { title: 'Preview Document', description: 'Verify formatting and layout alignment.' },
      { title: 'Save as PDF', description: 'Download the converted PDF file instantly.' }
    ]
  },
  '/tools/pdf-to-excel': {
    title: 'Convert PDF to Excel Online - Extract Tables to XLSX | Tools Cafe',
    description: 'Extract tabular data from PDF files directly into editable Microsoft Excel (XLSX) spreadsheets.',
    keywords: ['pdf to excel', 'convert pdf to xlsx', 'extract table from pdf', 'pdf to spreadsheet free'],
    canonical: `${SITE_URL}/tools/pdf-to-excel`,
    category: 'pdf',
    categoryName: 'PDF Tools',
    schemaType: 'WebApplication'
  },

  // Image Tools
  '/tools/compress-image': {
    title: 'Compress Image Online - Reduce JPG & PNG Size Free | Tools Cafe',
    description: 'Compress JPG, PNG, and WebP images up to 80% without noticeable quality loss. Fast batch compression in browser.',
    keywords: ['compress image', 'reduce image size', 'image compressor online', 'compress jpg', 'compress png'],
    canonical: `${SITE_URL}/tools/compress-image`,
    category: 'image',
    categoryName: 'Image Tools',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Select Images', description: 'Drop your JPG, PNG, or WebP files into the compressor.' },
      { title: 'Adjust Quality Slider', description: 'Fine-tune quality percentage or target KB size.' },
      { title: 'Download Compressed Images', description: 'Save individual compressed photos or download all as a ZIP.' }
    ],
    faqs: [
      {
        question: 'Does image compression lower visible resolution?',
        answer: 'Our smart compression algorithm removes unnecessary metadata and optimizes color channels while keeping visually lossless clarity.'
      }
    ]
  },
  '/tools/image-resize': {
    title: 'Image Resizer Online - Change Photo Dimensions Free | Tools Cafe',
    description: 'Resize JPG, PNG, and WebP images by exact pixels or percentages. Maintain aspect ratio with crisp output.',
    keywords: ['resize image', 'image resizer online', 'change photo size pixels', 'resize photo online free'],
    canonical: `${SITE_URL}/tools/image-resize`,
    category: 'image',
    categoryName: 'Image Tools',
    schemaType: 'WebApplication'
  },
  '/tools/image-crop': {
    title: 'Crop Image Online - Cut Photos Free & Fast | Tools Cafe',
    description: 'Crop images to standard aspect ratios (1:1, 16:9, 4:3, 3:2) or custom boundaries. Free online image cropper.',
    keywords: ['crop image', 'image cropper online', 'cut photo online', 'aspect ratio cropper'],
    canonical: `${SITE_URL}/tools/image-crop`,
    category: 'image',
    categoryName: 'Image Tools',
    schemaType: 'WebApplication'
  },
  '/tools/jpg-to-png': {
    title: 'Convert JPG to PNG Online - Free Image Format Converter | Tools Cafe',
    description: 'Convert JPG photos to PNG format instantly. 100% free and private browser processing.',
    keywords: ['jpg to png', 'convert jpg to png', 'jpeg to png converter online'],
    canonical: `${SITE_URL}/tools/jpg-to-png`,
    category: 'image',
    categoryName: 'Image Tools',
    schemaType: 'WebApplication'
  },
  '/tools/png-to-jpg': {
    title: 'Convert PNG to JPG Online - Free & Fast | Tools Cafe',
    description: 'Convert PNG images with transparent or solid backgrounds into lightweight JPG files.',
    keywords: ['png to jpg', 'convert png to jpg', 'png to jpeg converter free'],
    canonical: `${SITE_URL}/tools/png-to-jpg`,
    category: 'image',
    categoryName: 'Image Tools',
    schemaType: 'WebApplication'
  },
  '/tools/webp-to-jpg': {
    title: 'Convert WebP to JPG Online - Free WebP Converter | Tools Cafe',
    description: 'Convert WebP images to universal JPG photos for full compatibility across all applications.',
    keywords: ['webp to jpg', 'convert webp to jpg', 'webp converter online free'],
    canonical: `${SITE_URL}/tools/webp-to-jpg`,
    category: 'image',
    categoryName: 'Image Tools',
    schemaType: 'WebApplication'
  },
  '/tools/jpg-to-webp': {
    title: 'Convert JPG to WebP Online - Next-Gen Image Format | Tools Cafe',
    description: 'Convert JPG photos to lightweight WebP format to accelerate website loading speeds and save bandwith.',
    keywords: ['jpg to webp', 'convert jpg to webp', 'jpeg to webp converter'],
    canonical: `${SITE_URL}/tools/jpg-to-webp`,
    category: 'image',
    categoryName: 'Image Tools',
    schemaType: 'WebApplication'
  },

  // Document & Studio Tools
  '/tools/passport-photo': {
    title: 'Passport Photo Maker Online - Free Printable A4 Grid | Tools Cafe',
    description: 'Create standard passport and visa photos online. Crop, adjust brightness, set background color, and export printable A4 photo sheets (4, 6, 8, 12 photos).',
    keywords: ['passport photo maker', 'free passport size photo maker', 'printable passport photos A4', 'visa photo generator online'],
    canonical: `${SITE_URL}/tools/passport-photo`,
    category: 'identity',
    categoryName: 'Identity & Photo',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Upload Photo', description: 'Upload a clear front-facing portrait photo.' },
      { title: 'Crop & Adjust', description: 'Fit head size inside official guidelines, adjust background and filters.' },
      { title: 'Print A4 Sheet', description: 'Download a print-ready A4 PDF grid formatted with multiple passport copies.' }
    ],
    faqs: [
      {
        question: 'What photo sizes are supported for passport photos?',
        answer: 'Supports standard 2x2 inch (US), 35x45 mm (UK/EU/India), and custom dimensions.'
      }
    ]
  },
  '/tools/doc-formatter': {
    title: 'ID Card & Document Print Formatter - A4 PVC Layout | Tools Cafe',
    description: 'Format front and back sides of Aadhaar, PAN, Voter ID, or License onto single A4 PDF sheets for easy double-sided printing.',
    keywords: ['id card print formatter', 'aadhaar card print layout', 'double side id card printing', 'pvc card printable pdf'],
    canonical: `${SITE_URL}/tools/doc-formatter`,
    category: 'identity',
    categoryName: 'Identity & Photo',
    schemaType: 'WebApplication'
  },
  '/tools/id-card-maker': {
    title: 'ID Card Maker Online - Design & Print Badges Free | Tools Cafe',
    description: 'Design employee, student, or visitor ID badges online. Custom photo, logo, barcodes, and printable PDF output.',
    keywords: ['id card maker', 'student id generator', 'employee badge designer', 'make id card online free'],
    canonical: `${SITE_URL}/tools/id-card-maker`,
    category: 'identity',
    categoryName: 'Identity & Photo',
    schemaType: 'WebApplication'
  },

  // Creative & Career Tools
  '/tools/resume-maker': {
    title: 'Free Resume Builder - Professional CV Maker Online | Tools Cafe',
    description: 'Build modern, ATS-friendly resumes and CVs online. Formatted templates, instant PDF preview, and clean styling with zero registration required.',
    keywords: ['resume maker', 'cv builder free', 'ats friendly resume template', 'create resume online pdf', 'free resume generator'],
    canonical: `${SITE_URL}/tools/resume-maker`,
    category: 'creative',
    categoryName: 'Creative & Business',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Fill Information', description: 'Enter contact details, education, experience, and key skills.' },
      { title: 'Choose Template', description: 'Select from Minimalist, Creative, or Executive document layouts.' },
      { title: 'Export PDF Resume', description: 'Download your ATS-compatible resume PDF instantly.' }
    ],
    faqs: [
      {
        question: 'Are the created resumes ATS compliant?',
        answer: 'Yes! Text and headings are compiled as native selectable vector PDF elements that ATS scanners easily read.'
      }
    ]
  },
  '/tools/marriage-biodata': {
    title: 'Marriage Biodata Maker - Elegant Traditional Layouts | Tools Cafe',
    description: 'Create beautiful marriage biodata sheets online with traditional border motifs, astrological details, and family history.',
    keywords: ['marriage biodata maker', 'wedding biodata online', 'biodata format for marriage', 'free marriage biodata pdf'],
    canonical: `${SITE_URL}/tools/marriage-biodata`,
    category: 'creative',
    categoryName: 'Creative & Business',
    schemaType: 'WebApplication'
  },
  '/tools/application-maker': {
    title: 'Application & Letter Writer - Standard Templates | Tools Cafe',
    description: 'Generate clean leave applications, job cover letters, formal complaints, and request letters into downloadable PDFs.',
    keywords: ['application maker', 'leave application template', 'letter generator online', 'formal letter builder'],
    canonical: `${SITE_URL}/tools/application-maker`,
    category: 'creative',
    categoryName: 'Creative & Business',
    schemaType: 'WebApplication'
  },
  '/tools/poster-maker': {
    title: 'Online Poster & Flyer Maker - Quick Design Tool | Tools Cafe',
    description: 'Create shop promotion posters, event flyers, and sale banners online with customizable headings and background themes.',
    keywords: ['poster maker online', 'flyer generator free', 'shop promotion poster', 'create poster pdf'],
    canonical: `${SITE_URL}/tools/poster-maker`,
    category: 'creative',
    categoryName: 'Creative & Business',
    schemaType: 'WebApplication'
  },
  '/tools/qr-generator': {
    title: 'Free QR Code Generator - Custom Colors & Logos | Tools Cafe',
    description: 'Generate high-resolution QR codes for websites, WiFi credentials, vCard contacts, and WhatsApp links. Download as PNG or SVG.',
    keywords: ['qr code generator', 'free qr maker', 'wifi qr code generator', 'vcard qr code online'],
    canonical: `${SITE_URL}/tools/qr-generator`,
    category: 'utility',
    categoryName: 'Utilities',
    schemaType: 'WebApplication',
    steps: [
      { title: 'Select Data Type', description: 'Choose URL, text, WiFi, Email, or Contact details.' },
      { title: 'Customize Appearance', description: 'Set colors, margin size, and error correction levels.' },
      { title: 'Download QR Code', description: 'Download high-definition PNG or SVG graphic.' }
    ]
  },
  '/tools/print-portal': {
    title: 'Print Portal & Layout Calculator - Instant Page Prep | Tools Cafe',
    description: 'Prepare documents for double-sided booklet printing, grid multi-page printing, and scaling calculations.',
    keywords: ['print portal', 'booklet print calculator', 'n-up page printer', 'print layout optimizer'],
    canonical: `${SITE_URL}/tools/print-portal`,
    category: 'utility',
    categoryName: 'Utilities',
    schemaType: 'WebApplication'
  }
};

export const getSEOMetadata = (pathname: string): SEOMetadata => {
  if (seoDataMap[pathname]) {
    return seoDataMap[pathname];
  }
  // Default fallback for unmatched routes
  const cleanPath = pathname.split('?')[0];
  if (seoDataMap[cleanPath]) {
    return seoDataMap[cleanPath];
  }
  
  // Dynamic fallback based on path name
  const toolName = pathname.replace('/tools/', '').replace(/-/g, ' ');
  const capitalized = toolName.charAt(0).toUpperCase() + toolName.slice(1);
  return {
    title: `${capitalized || 'Free Web Tool'} - Online & 100% Private | Tools Cafe`,
    description: `Use ${capitalized || 'this tool'} online for free on Tools Cafe. Fast, secure, client-side processing with zero file uploads.`,
    keywords: [toolName, 'free online tool', 'tools cafe', 'client side processing'],
    canonical: `${SITE_URL}${pathname}`,
    schemaType: 'WebApplication'
  };
};
