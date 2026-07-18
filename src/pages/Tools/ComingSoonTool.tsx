import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Bell, Share2 } from 'lucide-react';
import { toolsList } from '../../utils/toolsList';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../../components/ui/Icon';

export const ComingSoonTool: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  // Find tool by route
  const currentTool = toolsList.find((t) => t.route === location.pathname) || {
    id: 'unknown',
    nameKey: 'tool.comingSoon',
    descKey: 'tool.comingSoonDesc',
    category: 'pdf',
    icon: 'Clock'
  };

  const handleNotifySimulate = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you! We will notify you once this tool is launched.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link
        to="/tools"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-600 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back to All Tools</span>
      </Link>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-8 md:p-12 shadow-xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col items-center text-center max-w-lg mx-auto">
          {/* Tool Icon */}
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-6 shadow-md">
            <Icon name={currentTool.icon} size={32} />
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-2">
            {currentTool.category.toUpperCase()} TOOL
          </span>

          <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-3">
            {t(currentTool.nameKey)}
          </h1>

          <p className="text-sm text-slate-400 dark:text-slate-400 mb-8">
            {t(currentTool.descKey)}
          </p>

          <div className="w-full border-t border-slate-100 dark:border-slate-800/50 my-6" />

          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-semibold text-sm mb-6">
            <Clock className="w-4 h-4 animate-spin-slow" />
            <span>Development in Progress</span>
          </div>

          <h3 className="font-heading text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
            Notify Me When Ready
          </h3>

          <form onSubmit={handleNotifySimulate} className="flex gap-2 w-full max-w-md">
            <input
              type="email"
              required
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 hover:bg-slate-700 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Bell size={14} />
              <span>Subscribe</span>
            </button>
          </form>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Copied link to clipboard!');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition-colors"
            >
              <Share2 size={13} />
              <span>Share Tool</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonTool;
