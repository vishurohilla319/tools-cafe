export interface Tool {
  id: string;
  nameKey: string;
  descKey: string;
  route: string;
  category: 'pdf' | 'image' | 'photo' | 'document' | 'design' | 'idcard' | 'print' | 'business' | 'qr';
  icon: string; // Lucide icon name string
  isPopular: boolean;
  isClientSide: boolean;
}

export interface Category {
  id: 'pdf' | 'image' | 'photo' | 'document' | 'design' | 'idcard' | 'print' | 'business' | 'qr';
  nameKey: string;
  icon: string;
}

export const categoriesList: Category[] = [
  { id: 'pdf', nameKey: 'cat.pdf', icon: 'FileText' },
  { id: 'image', nameKey: 'cat.image', icon: 'Image' },
  { id: 'photo', nameKey: 'cat.photo', icon: 'Camera' },
  { id: 'document', nameKey: 'cat.document', icon: 'FileSpreadsheet' },
  { id: 'design', nameKey: 'cat.design', icon: 'Palette' },
  { id: 'idcard', nameKey: 'cat.idcard', icon: 'Contact' },
  { id: 'print', nameKey: 'cat.print', icon: 'Printer' },
  { id: 'business', nameKey: 'cat.business', icon: 'Briefcase' },
  { id: 'qr', nameKey: 'cat.qr', icon: 'QrCode' }
];

export const toolsList: Tool[] = [
  // PDF Tools
  {
    id: 'pdf-to-word',
    nameKey: 'tool.pdfToWord.title',
    descKey: 'tool.pdfToWord.desc',
    route: '/tools/pdf-to-word',
    category: 'pdf',
    icon: 'FileText',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'jpg-to-pdf',
    nameKey: 'tool.jpgToPdf.title',
    descKey: 'tool.jpgToPdf.desc',
    route: '/tools/jpg-to-pdf',
    category: 'pdf',
    icon: 'FileImage',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'png-to-pdf',
    nameKey: 'tool.jpgToPdf.title', // Reusing translation or mapping to same page
    descKey: 'tool.jpgToPdf.desc',
    route: '/tools/png-to-pdf',
    category: 'pdf',
    icon: 'FileImage',
    isPopular: false,
    isClientSide: true
  },
  {
    id: 'merge-pdf',
    nameKey: 'tool.mergePdf.title',
    descKey: 'tool.mergePdf.desc',
    route: '/tools/merge-pdf',
    category: 'pdf',
    icon: 'Merge',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'merge-jpg-pdf',
    nameKey: 'tool.mergeJpgPdf.title',
    descKey: 'tool.mergeJpgPdf.desc',
    route: '/tools/merge-jpg-pdf',
    category: 'pdf',
    icon: 'Layers',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'delete-pdf-pages',
    nameKey: 'tool.deletePdf.title',
    descKey: 'tool.deletePdf.desc',
    route: '/tools/delete-pdf-pages',
    category: 'pdf',
    icon: 'Trash2',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'pdf-to-jpg',
    nameKey: 'tool.pdfToJpg.title',
    descKey: 'tool.pdfToJpg.desc',
    route: '/tools/pdf-to-jpg',
    category: 'pdf',
    icon: 'FileOutput',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'pdf-editor',
    nameKey: 'tool.pdfEditor.title',
    descKey: 'tool.pdfEditor.desc',
    route: '/tools/pdf-editor',
    category: 'pdf',
    icon: 'Edit3',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'compress-pdf',
    nameKey: 'tool.compressPdf.title',
    descKey: 'tool.compressPdf.desc',
    route: '/tools/compress-pdf',
    category: 'pdf',
    icon: 'FileDown',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'split-pdf',
    nameKey: 'Split PDF',
    descKey: 'Split PDF into individual files page-by-page.',
    route: '/tools/split-pdf',
    category: 'pdf',
    icon: 'Scissors',
    isPopular: false,
    isClientSide: true
  },
  {
    id: 'rotate-pdf',
    nameKey: 'Rotate PDF',
    descKey: 'Rotate pages of your PDF document.',
    route: '/tools/rotate-pdf',
    category: 'pdf',
    icon: 'RotateCw',
    isPopular: false,
    isClientSide: true
  },
  {
    id: 'word-to-pdf',
    nameKey: 'tool.wordToPdf.title',
    descKey: 'tool.wordToPdf.desc',
    route: '/tools/word-to-pdf',
    category: 'pdf',
    icon: 'FileText',
    isPopular: true,
    isClientSide: true
  },

  // Image Tools
  {
    id: 'compress-image',
    nameKey: 'tool.compressImage.title',
    descKey: 'tool.compressImage.desc',
    route: '/tools/compress-image',
    category: 'image',
    icon: 'Minimize',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'image-resize',
    nameKey: 'tool.imageResize.title',
    descKey: 'tool.imageResize.desc',
    route: '/tools/image-resize',
    category: 'image',
    icon: 'Maximize',
    isPopular: false,
    isClientSide: true
  },
  {
    id: 'image-crop',
    nameKey: 'tool.imageCrop.title',
    descKey: 'tool.imageCrop.desc',
    route: '/tools/image-crop',
    category: 'image',
    icon: 'Crop',
    isPopular: false,
    isClientSide: true
  },
  {
    id: 'jpg-to-png',
    nameKey: 'tool.jpgToPng.title',
    descKey: 'tool.jpgToPng.desc',
    route: '/tools/jpg-to-png',
    category: 'image',
    icon: 'Replace',
    isPopular: false,
    isClientSide: true
  },
  {
    id: 'webp-to-jpg',
    nameKey: 'tool.webpToJpg.title',
    descKey: 'tool.webpToJpg.desc',
    route: '/tools/webp-to-jpg',
    category: 'image',
    icon: 'Replace',
    isPopular: false,
    isClientSide: true
  },

  // Photo Tools
  {
    id: 'passport-photo',
    nameKey: 'tool.passport.title',
    descKey: 'tool.passport.desc',
    route: '/tools/passport-photo',
    category: 'photo',
    icon: 'Camera',
    isPopular: true,
    isClientSide: true
  },

  // Document Tools
  {
    id: 'doc-formatter',
    nameKey: 'tool.docFormatter.title',
    descKey: 'tool.docFormatter.desc',
    route: '/tools/doc-formatter',
    category: 'document',
    icon: 'FileSpreadsheet',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'resume-maker',
    nameKey: 'tool.resume.title',
    descKey: 'tool.resume.desc',
    route: '/tools/resume-maker',
    category: 'document',
    icon: 'FileUser',
    isPopular: true,
    isClientSide: true
  },
  {
    id: 'marriage-biodata',
    nameKey: 'tool.marriage.title',
    descKey: 'tool.marriage.desc',
    route: '/tools/marriage-biodata',
    category: 'document',
    icon: 'HeartHandshake',
    isPopular: false,
    isClientSide: true
  },
  {
    id: 'application-maker',
    nameKey: 'tool.application.title',
    descKey: 'tool.application.desc',
    route: '/tools/application-maker',
    category: 'document',
    icon: 'FileEdit',
    isPopular: false,
    isClientSide: true
  },

  // Design Studio
  {
    id: 'poster-maker',
    nameKey: 'tool.poster.title',
    descKey: 'tool.poster.desc',
    route: '/tools/poster-maker',
    category: 'design',
    icon: 'Palette',
    isPopular: false,
    isClientSide: true
  },
  {
    id: 'shop-promotion',
    nameKey: 'tool.shopPromotion.title',
    descKey: 'tool.shopPromotion.desc',
    route: '/tools/shop-promotion',
    category: 'design',
    icon: 'Megaphone',
    isPopular: false,
    isClientSide: true
  },
  {
    id: 'id-card-maker',
    nameKey: 'tool.idMaker.title',
    descKey: 'tool.idMaker.desc',
    route: '/tools/id-card-maker',
    category: 'idcard',
    icon: 'Contact',
    isPopular: false,
    isClientSide: true
  },

  // QR Code
  {
    id: 'qr-generator',
    nameKey: 'tool.qrGen.title',
    descKey: 'tool.qrGen.desc',
    route: '/tools/qr-generator',
    category: 'qr',
    icon: 'QrCode',
    isPopular: true,
    isClientSide: true
  },

  // Print Tools & Automation
  {
    id: 'print-portal',
    nameKey: 'Print Shop Upload',
    descKey: 'Submit files to local cyber cafe printers with layout instructions.',
    route: '/tools/print-portal',
    category: 'print',
    icon: 'Printer',
    isPopular: true,
    isClientSide: false
  }
];
