import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, ShieldAlert, Heart, Printer } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 dark:bg-[#06070a] border-t border-slate-250/20 dark:border-dark-border text-slate-500 dark:text-slate-400 py-12 px-4 transition-colors duration-300 w-full mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8">
        
        {/* Branding & Privacy Assurance */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/20">
              <Printer className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight bg-gradient-to-r from-brand-600 to-indigo-400 bg-clip-text text-transparent">
              Tools Cafe
            </span>
          </div>
          
          <p className="text-xs max-w-sm leading-relaxed text-slate-400">
            All-in-one suite of 100% free and private browser tools. Convert JPG to PDF, merge PDFs, edit documents, generate QR codes, create resume CVs & printable passport photos with zero server uploads.
          </p>

          {/* Critical Privacy Banner */}
          <div className="inline-flex items-start gap-2.5 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 max-w-md">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold">100% Client-Side Privacy:</span> {t('home.whyClientSideDesc')}
            </div>
          </div>
        </div>

        {/* Popular PDF Tools (SEO Keywords Column) */}
        <div>
          <h3 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
            PDF Tools
          </h3>
          <ul className="space-y-2 text-xs font-medium">
            <li>
              <Link to="/tools/jpg-to-pdf" className="hover:text-brand-500 transition-colors">
                JPG to PDF Converter
              </Link>
            </li>
            <li>
              <Link to="/tools/merge-pdf" className="hover:text-brand-500 transition-colors">
                Merge PDF Files
              </Link>
            </li>
            <li>
              <Link to="/tools/pdf-to-jpg" className="hover:text-brand-500 transition-colors">
                PDF to JPG Converter
              </Link>
            </li>
            <li>
              <Link to="/tools/pdf-editor" className="hover:text-brand-500 transition-colors">
                Edit PDF Online
              </Link>
            </li>
            <li>
              <Link to="/tools/compress-pdf" className="hover:text-brand-500 transition-colors">
                Compress PDF File
              </Link>
            </li>
            <li>
              <Link to="/tools/word-to-pdf" className="hover:text-brand-500 transition-colors">
                Word to PDF Converter
              </Link>
            </li>
          </ul>
        </div>

        {/* Image & Studio Tools (SEO Keywords Column) */}
        <div>
          <h3 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
            Studio & Utilities
          </h3>
          <ul className="space-y-2 text-xs font-medium">
            <li>
              <Link to="/tools/passport-photo" className="hover:text-brand-500 transition-colors">
                Passport Photo Maker
              </Link>
            </li>
            <li>
              <Link to="/tools/resume-maker" className="hover:text-brand-500 transition-colors">
                Free Resume Builder CV
              </Link>
            </li>
            <li>
              <Link to="/tools/doc-formatter" className="hover:text-brand-500 transition-colors">
                ID Card Print Formatter
              </Link>
            </li>
            <li>
              <Link to="/tools/compress-image" className="hover:text-brand-500 transition-colors">
                Compress Image Online
              </Link>
            </li>
            <li>
              <Link to="/tools/qr-generator" className="hover:text-brand-500 transition-colors">
                Free QR Code Generator
              </Link>
            </li>
            <li>
              <Link to="/tools/marriage-biodata" className="hover:text-brand-500 transition-colors">
                Marriage Biodata Maker
              </Link>
            </li>
          </ul>
        </div>

        {/* Support & Legal */}
        <div>
          <h3 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
            Navigation & Legal
          </h3>
          <ul className="space-y-2 text-xs font-medium">
            <li>
              <Link to="/tools" className="hover:text-brand-500 transition-colors font-bold text-brand-600 dark:text-brand-400">
                All Web Tools Directory
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-brand-500 transition-colors">
                Plans & Pricing
              </Link>
            </li>
            <li>
              <a href="#why-privacy" className="hover:text-brand-500 transition-colors">
                Privacy Architecture
              </a>
            </li>
            <li>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Authorized Use Only</span>
              </span>
            </li>
            <li>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="text-[11px]">support@toolscafe.com</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-850 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
        <div>
          &copy; {currentYear} Tools Cafe. All rights reserved. 100% Free & Private Online Digital Tools.
        </div>
        <div className="flex items-center gap-1.5 mt-4 sm:mt-0">
          <span>Made with</span>
          <Heart className="w-3 h-3 text-red-500 fill-current animate-pulse" />
          <span>for privacy-conscious users worldwide</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
