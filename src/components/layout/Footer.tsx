import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, ShieldAlert, Heart, Printer } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 dark:bg-[#06070a] border-t border-slate-250/20 dark:border-dark-border text-slate-500 dark:text-slate-400 py-12 px-4 transition-colors duration-300 w-full mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Branding & Privacy Assurance */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Printer className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight bg-gradient-to-r from-brand-600 to-indigo-400 bg-clip-text text-transparent">
              Tools Cafe
            </span>
          </div>
          
          <p className="text-xs max-w-sm leading-relaxed text-slate-400">
            A premium Indian SaaS suite of digital and print-ready tools. Optimize your printing workflow, format documents, generate high-quality outputs instantly.
          </p>

          {/* Critical Privacy Banner */}
          <div className="inline-flex items-start gap-2.5 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 max-w-md">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold">100% Client-Side Privacy:</span> {t('home.whyClientSideDesc')}
            </div>
          </div>
        </div>

        {/* Links */}
        <div>
          <h3 className="font-heading text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
            Product
          </h3>
          <ul className="space-y-2.5 text-xs font-medium">
            <li>
              <Link to="/tools" className="hover:text-brand-500 transition-colors">
                All Tools
              </Link>
            </li>
            <li>
              <Link to="/tools?category=pdf" className="hover:text-brand-500 transition-colors">
                PDF Converters
              </Link>
            </li>
            <li>
              <Link to="/tools?category=image" className="hover:text-brand-500 transition-colors">
                Image Compressors
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-brand-500 transition-colors">
                Plans & Pricing
              </Link>
            </li>
          </ul>
        </div>

        {/* Support & Legal */}
        <div>
          <h3 className="font-heading text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
            Security & Legal
          </h3>
          <ul className="space-y-2.5 text-xs font-medium">
            <li>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Authorized Printing Only</span>
              </span>
            </li>
            <li>
              <a href="#privacy" className="hover:text-brand-500 transition-colors">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#terms" className="hover:text-brand-500 transition-colors">
                Terms of Service
              </a>
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
          &copy; {currentYear} Tools Cafe. All rights reserved. Built for Indian digital operators, cyber cafes & students.
        </div>
        <div className="flex items-center gap-1.5 mt-4 sm:mt-0">
          <span>Made with</span>
          <Heart className="w-3 h-3 text-red-500 fill-current animate-pulse" />
          <span>in India</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
