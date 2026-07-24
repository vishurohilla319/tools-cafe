import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ShieldCheck, Zap, Lock, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { getSEOMetadata } from '../../utils/seoData';
import { toolsList } from '../../utils/toolsList';
import Icon from '../ui/Icon';

interface SEOSectionProps {
  toolId?: string;
}

export const SEOSection: React.FC<SEOSectionProps> = ({ toolId }) => {
  const location = useLocation();
  const meta = getSEOMetadata(location.pathname);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Get 4 related tools from the same category or overall list
  const currentCategory = meta.category || 'pdf';
  const relatedTools = toolsList
    .filter((t) => t.id !== toolId && (t.category === currentCategory || t.isPopular))
    .slice(0, 4);

  const steps = meta.steps || [
    { title: 'Upload Your File', description: 'Drag and drop or select your document/image from your device.' },
    { title: 'Customize Settings', description: 'Adjust format parameters, layout options, or image quality.' },
    { title: 'Download Instantly', description: 'Click process and download your converted file directly in your browser.' }
  ];

  const faqs = meta.faqs || [
    {
      question: 'Is this tool 100% free to use?',
      answer: 'Yes! All tools on Tools Cafe are 100% free with unlimited access for personal and commercial tasks.'
    },
    {
      question: 'Are my files uploaded or stored on any server?',
      answer: 'No. Tools Cafe operates on a privacy-first, client-side architecture. All conversion algorithms run inside your web browser memory.'
    },
    {
      question: 'Does this tool work on mobile devices?',
      answer: 'Yes, Tools Cafe is fully responsive and compatible with mobile phones, tablets, laptops, and desktop devices.'
    }
  ];

  const toolName = meta.title ? meta.title.split('-')[0].trim() : 'Online Tool';

  return (
    <section className="w-full mt-16 pt-12 border-t border-slate-200/80 dark:border-slate-800/80">
      
      {/* 1. How It Works / Step-by-Step Guide */}
      <div className="mb-14 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>SIMPLE 3-STEP PROCESS</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            How to Use {toolName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
            Follow these easy steps to process your files securely in seconds.
          </p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0">
          {steps.map((step, index) => (
            <li
              key={index}
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-dark-card shadow-sm hover:shadow-md transition-shadow relative"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white font-extrabold text-sm flex items-center justify-center mb-4 shadow-md shadow-brand-600/20">
                {index + 1}
              </div>
              <h3 className="font-heading text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
                {step.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* 2. Trust & Privacy Banner */}
      <div className="mb-14 max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 text-white p-8 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-[-20px] bottom-[-20px] w-64 h-64 bg-brand-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>100% CLIENT-SIDE SECURITY</span>
            </div>
            <h3 className="font-heading text-xl sm:text-2xl font-bold">
              Your Privacy is Guarantee #1
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Unlike cloud services that require uploading your private files to remote servers, Tools Cafe executes all operations directly in your browser. Your files never leave your device.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center w-24">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mb-1" />
              <span className="text-[10px] font-bold">No Uploads</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center w-24">
              <Zap className="w-6 h-6 text-amber-400 mb-1" />
              <span className="text-[10px] font-bold">Instant Speed</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Frequently Asked Questions (FAQ) Section */}
      <div className="mb-14 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            Got Questions? We Have Answers
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-brand-500' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-4 pt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-850">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Related Tools Internal Linking */}
      {relatedTools.length > 0 && (
        <div className="max-w-4xl mx-auto pt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100">
              Related Tools You Might Like
            </h3>
            <Link
              to="/tools"
              className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1"
            >
              <span>View All Tools</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {relatedTools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.route}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card hover:-translate-y-1 transition-all duration-200 shadow-sm flex items-center gap-3.5 group"
              >
                <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform">
                  <Icon name={tool.icon} size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-500 transition-colors line-clamp-1">
                    {tool.id.replace(/-/g, ' ').toUpperCase()}
                  </h4>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {tool.category} Tool
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </section>
  );
};

export default SEOSection;
