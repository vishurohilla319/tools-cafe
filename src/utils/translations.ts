export type Language = 'en' | 'hi';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav Bar
    'nav.home': 'Home',
    'nav.allTools': 'All Tools',
    'nav.pdfTools': 'PDF Tools',
    'nav.imageTools': 'Image Tools',
    'nav.designTools': 'Design Tools',
    'nav.printTools': 'Print Tools',
    'nav.pricing': 'Pricing',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.dashboard': 'Dashboard',
    'nav.admin': 'Admin',
    'nav.logout': 'Logout',

    // Hero
    'hero.title': 'All Your Digital & Printing Tools in One Place',
    'hero.subtitle': 'Convert PDFs, edit images, create professional documents, prepare print-ready files, and manage your printing workflow.',
    'hero.cta.explore': 'Explore All Tools',
    'hero.cta.free': 'Start for Free',

    // Home / Search
    'home.searchPlaceholder': 'Search tools (e.g., merge PDF, JPG to PDF, compressor)...',
    'home.popularTools': 'Popular Tools',
    'home.popularSubtitle': 'Most frequently used tools by print shops and digital operators',
    'home.whyClientSide': 'Processed Completely in Your Browser',
    'home.whyClientSideDesc': 'Your files are processed client-side. They never touch our servers, ensuring absolute privacy, zero upload wait times, and rapid completion speeds.',
    'home.categories': 'Browse by Category',

    // Categories
    'cat.pdf': 'PDF Tools',
    'cat.image': 'Image Tools',
    'cat.photo': 'Photo Tools',
    'cat.document': 'Document Tools',
    'cat.design': 'Design Studio',
    'cat.idcard': 'ID & Card Tools',
    'cat.print': 'Print Tools',
    'cat.business': 'Business Tools',
    'cat.qr': 'QR & Payment Tools',

    // Shared Tool UI
    'tool.upload': 'Upload File',
    'tool.dragdrop': 'Drag and drop your file here, or click to browse',
    'tool.processing': 'Processing...',
    'tool.download': 'Download File',
    'tool.print': 'Print Now',
    'tool.configure': 'Configure',
    'tool.preview': 'Preview',
    'tool.success': 'Operation completed successfully!',
    'tool.error': 'An error occurred. Please try again.',
    'tool.comingSoon': 'Coming Soon',
    'tool.comingSoonDesc': 'We are currently developing this tool. Check back soon!',

    // Specific Tools Titles & Descs
    'tool.jpgToPdf.title': 'JPG to PDF Converter',
    'tool.jpgToPdf.desc': 'Convert JPG images to PDF documents. Customize page margins, orientation, and size.',
    'tool.mergePdf.title': 'Merge PDF',
    'tool.mergePdf.desc': 'Combine multiple PDF files into a single document. Reorder pages with drag and drop.',
    'tool.deletePdf.title': 'Delete PDF Pages',
    'tool.deletePdf.desc': 'Remove unwanted pages from a PDF. Select page thumbnails to remove them.',
    'tool.pdfToJpg.title': 'PDF to JPG Converter',
    'tool.pdfToJpg.desc': 'Convert PDF pages into high-quality JPG or PNG images directly in your browser.',
    'tool.compressImage.title': 'Image Compressor',
    'tool.compressImage.desc': 'Compress JPG, PNG, or WebP images to a targeted size in KB or percentage quality.',
    
    // Passport photo maker titles
    'tool.passport.title': 'Passport Photo Maker',
    'tool.passport.desc': 'Create print-ready passport-sized photos with customizable crop, background, and sheet layouts.',
    'tool.docFormatter.title': 'ID & Document Print Formatter',
    'tool.docFormatter.desc': 'Format front and back scans of Aadhar, PAN, or other ID cards onto a single A4 print sheet.',
    'tool.resume.title': 'Resume / CV Maker',
    'tool.resume.desc': 'Create a professional, ATS-friendly resume using multiple clean templates.',
    'tool.marriage.title': 'Marriage Biodata Maker',
    'tool.marriage.desc': 'Create beautiful traditional and modern Indian marriage biodata sheets.',
    'tool.poster.title': 'Quick Poster Maker',
    'tool.poster.desc': 'Design posters for social media posts or flyers with text, shapes, and custom layouts.',
    'tool.qrGen.title': 'QR & UPI QR Code Generator',
    'tool.qrGen.desc': 'Create QR codes for text, WiFi networks, and instant UPI payment codes with payee detail fields.',
    'tool.idMaker.title': 'Generic ID Card Maker',
    'tool.idMaker.desc': 'Create custom employee, student, or membership identity cards with front/back templates.'
  },
  hi: {
    // Nav Bar
    'nav.home': 'होम',
    'nav.allTools': 'सभी टूल्स',
    'nav.pdfTools': 'पीडीएफ टूल्स',
    'nav.imageTools': 'इमेज टूल्स',
    'nav.designTools': 'डिज़ाइन टूल्स',
    'nav.printTools': 'प्रिंट टूल्स',
    'nav.pricing': 'कीमतें',
    'nav.login': 'लॉगिन',
    'nav.signup': 'साइन अप',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.admin': 'एडमिन',
    'nav.logout': 'लॉगआउट',

    // Hero
    'hero.title': 'आपके सभी डिजिटल और प्रिंटिंग टूल्स एक जगह पर',
    'hero.subtitle': 'पीडीएफ बदलें, इमेज एडिट करें, प्रोफेशनल डॉक्यूमेंट्स बनाएं, प्रिंट-रेडी फाइल्स तैयार करें और अपना प्रिंटिंग काम आसानी से मैनेज करें।',
    'hero.cta.explore': 'सभी टूल्स देखें',
    'hero.cta.free': 'फ्री में शुरू करें',

    // Home / Search
    'home.searchPlaceholder': 'टूल्स खोजें (जैसे: मर्ज पीडीएफ, जेपीजी टू पीडीएफ, इमेज कंप्रेसर)...',
    'home.popularTools': 'लोकप्रिय टूल्स',
    'home.popularSubtitle': 'प्रिंट शॉप्स और डिजिटल ऑपरेटरों द्वारा सबसे ज्यादा इस्तेमाल किए जाने वाले टूल्स',
    'home.whyClientSide': 'पूरी तरह से आपके ब्राउज़र में सुरक्षित',
    'home.whyClientSideDesc': 'आपकी फाइलें आपके डिवाइस पर ही प्रोसेस होती हैं। वे कभी भी हमारे सर्वर पर अपलोड नहीं की जातीं, जिससे पूरी गोपनीयता और सुपरफास्ट स्पीड मिलती है।',
    'home.categories': 'श्रेणी अनुसार खोजें',

    // Categories
    'cat.pdf': 'पीडीएफ टूल्स',
    'cat.image': 'इमेज टूल्स',
    'cat.photo': 'फ़ोटो टूल्स',
    'cat.document': 'डॉक्यूमेंट टूल्स',
    'cat.design': 'डिज़ाइन स्टूडियो',
    'cat.idcard': 'आईडी और कार्ड टूल्स',
    'cat.print': 'प्रिंट टूल्स',
    'cat.business': 'बिजनेस टूल्स',
    'cat.qr': 'क्यूआर और पेमेंट टूल्स',

    // Shared Tool UI
    'tool.upload': 'फ़ाइल अपलोड करें',
    'tool.dragdrop': 'फ़ाइल को यहाँ खींचें या ब्राउज़ करने के लिए क्लिक करें',
    'tool.processing': 'प्रोसेसिंग हो रही है...',
    'tool.download': 'फ़ाइल डाउनलोड करें',
    'tool.print': 'अभी प्रिंट करें',
    'tool.configure': 'कॉन्फ़िगर करें',
    'tool.preview': 'पूर्वावलोकन',
    'tool.success': 'काम सफलतापूर्वक पूरा हुआ!',
    'tool.error': 'त्रुटि हुई। कृपया पुन: प्रयास करें।',
    'tool.comingSoon': 'जल्द ही आ रहा है',
    'tool.comingSoonDesc': 'हम इस टूल पर काम कर रहे हैं। जल्द ही उपलब्ध होगा!',

    // Specific Tools Titles & Descs
    'tool.jpgToPdf.title': 'जेपीजी से पीडीएफ कनवर्टर',
    'tool.jpgToPdf.desc': 'जेपीजी इमेजेस को पीडीएफ डॉक्यूमेंट में बदलें। पेज मार्जिन, ओरिएंटेशन और साइज सेट करें।',
    'tool.mergePdf.title': 'पीडीएफ मर्ज करें',
    'tool.mergePdf.desc': 'कई पीडीएफ फाइलों को एक ही डॉक्यूमेंट में जोड़ें। ड्रैग एंड ड्रॉप से क्रम बदलें।',
    'tool.deletePdf.title': 'पीडीएफ पेज हटाएं',
    'tool.deletePdf.desc': 'पीडीएफ से अनचाहे पेजों को हटाएं। डिलीट करने के लिए पेजों के थंबनेल चुनें।',
    'tool.pdfToJpg.title': 'पीडीएफ से जेपीजी कनवर्टर',
    'tool.pdfToJpg.desc': 'पीडीएफ पेजों को बिना सर्वर पर भेजे सीधे ब्राउज़र में हाई-क्वालिटी जेपीजी या पीएनजी इमेज में बदलें।',
    'tool.compressImage.title': 'इमेज कंप्रेसर',
    'tool.compressImage.desc': 'जेपीजी, पीएनजी, या वेबपी इमेज का साइज कम करें (केबी या क्वालिटी अनुसार)।',

    // Passport photo maker titles
    'tool.passport.title': 'पासपोर्ट फोटो मेकर',
    'tool.passport.desc': 'क्रॉप, बैकग्राउंड चेंज और पेज लेआउट सेटिंग्स के साथ प्रिंट-रेडी पासपोर्ट साइज फोटो बनाएं।',
    'tool.docFormatter.title': 'दस्तावेज़ और आईडी प्रिंट फॉर्मेटर',
    'tool.docFormatter.desc': 'आधार, पैन या अन्य आईडी कार्ड के आगे और पीछे के हिस्से को एक ए4 प्रिंट शीट पर व्यवस्थित करें।',
    'tool.resume.title': 'रेज़्यूमे / सीवी मेकर',
    'tool.resume.desc': 'सुंदर और क्लीन टेम्पलेट्स का उपयोग करके एक व्यावसायिक रेज़्यूमे बनाएं।',
    'tool.marriage.title': 'मैरिज बायोडाटा मेकर',
    'tool.marriage.desc': 'पारंपरिक और आधुनिक डिज़ाइनों के साथ सुंदर भारतीय शादी बायोडाटा शीट बनाएं।',
    'tool.poster.title': 'क्विक पोस्टर मेकर',
    'tool.poster.desc': 'टेक्स्ट, शेप और मनपसंद लेआउट के साथ सोशल मीडिया पोस्ट या विज्ञापन पोस्टर डिज़ाइन करें।',
    'tool.qrGen.title': 'क्यूआर और यूपीआई क्यूआर कोड जनरेटर',
    'tool.qrGen.desc': 'टेक्स्ट, वाईफाई नेटवर्क और तत्काल यूपीआई भुगतान क्यूआर कोड बनाएं।',
    'tool.idMaker.title': 'आईडी कार्ड मेकर',
    'tool.idMaker.desc': 'कर्मचारी, छात्र या सदस्यता कार्ड के लिए कस्टम आईडी कार्ड बनाएं।'
  }
};
