import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lock, User, Settings } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface ConversionLimitContextType {
  conversionCount: number;
  isLoggedIn: boolean;
  showLimitModal: boolean;
  setShowLimitModal: (show: boolean) => void;
}

const ConversionLimitContext = createContext<ConversionLimitContextType | undefined>(undefined);

let programmaticClickInProgress = false;

export const ConversionLimitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [conversionCount, setConversionCount] = useState(() => {
    const saved = localStorage.getItem('files_processed_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('files_processed_count');
      setConversionCount(saved ? parseInt(saved, 10) : 0);
      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    // Poll to keep in sync instantly across state updates in the same tab
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const checkAndIncrementLimit = (): boolean => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const saved = localStorage.getItem('files_processed_count');
    const count = saved ? parseInt(saved, 10) : 0;

    if (loggedIn) {
      // If logged in, increment the files processed count for dashboard usage, but never block
      localStorage.setItem('files_processed_count', String(count + 1));
      window.dispatchEvent(new Event('storage'));
      return true;
    }

    if (count >= 10) {
      return false; // Limit exceeded and user not logged in
    }

    // Increment and allow
    localStorage.setItem('files_processed_count', String(count + 1));
    window.dispatchEvent(new Event('storage'));
    return true;
  };

  useEffect(() => {
    // 1. Intercept JSX links and element clicks
    const handleWindowClick = (e: MouseEvent) => {
      if (programmaticClickInProgress) {
        return; // Avoid double checking
      }

      let target = e.target as HTMLElement | null;
      while (target && target !== document.body) {
        if (target.tagName === 'A' && target.hasAttribute('download')) {
          if (!checkAndIncrementLimit()) {
            e.preventDefault();
            e.stopPropagation();
            setShowLimitModal(true);
          }
          return;
        }
        target = target.parentElement;
      }
    };

    window.addEventListener('click', handleWindowClick, true);

    // 2. Intercept programmatic anchor click calls
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.hasAttribute('download')) {
        programmaticClickInProgress = true;
        try {
          if (!checkAndIncrementLimit()) {
            setShowLimitModal(true);
            return;
          }
        } finally {
          originalClick.apply(this);
          programmaticClickInProgress = false;
        }
      } else {
        originalClick.apply(this);
      }
    };

    // 3. Intercept window.open previews/prints of blobs/data
    const originalOpen = window.open;
    window.open = function (
      url?: string | URL,
      target?: string,
      features?: string
    ): Window | null {
      const urlStr = url ? url.toString() : '';
      if (urlStr.startsWith('blob:') || urlStr.startsWith('data:')) {
        if (!checkAndIncrementLimit()) {
          setShowLimitModal(true);
          return null;
        }
      }
      return originalOpen.call(window, url, target, features);
    };

    return () => {
      window.removeEventListener('click', handleWindowClick, true);
      HTMLAnchorElement.prototype.click = originalClick;
      window.open = originalOpen;
    };
  }, []);

  const handleLogin = (role: 'user' | 'admin') => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', role);
    setIsLoggedIn(true);
    setShowLimitModal(false);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <ConversionLimitContext.Provider
      value={{
        conversionCount,
        isLoggedIn,
        showLimitModal,
        setShowLimitModal,
      }}
    >
      {children}

      {/* Premium Glassmorphic Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full transform transition-all scale-100 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top color bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-600 via-indigo-500 to-violet-500" />

            {/* Lock icon */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white mb-6">
              <Lock className="w-6 h-6" />
            </div>

            {/* Content */}
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 text-center mb-2 font-heading">
              {t('limit.modal.title')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs text-center leading-relaxed mb-8">
              {t('limit.modal.description')}
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleLogin('user')}
                className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>{t('limit.modal.loginUser')}</span>
              </button>

              <button
                onClick={() => handleLogin('admin')}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>{t('limit.modal.loginAdmin')}</span>
              </button>

              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer text-center"
              >
                {t('limit.modal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConversionLimitContext.Provider>
  );
};

export const useConversionLimit = () => {
  const context = useContext(ConversionLimitContext);
  if (!context) {
    throw new Error('useConversionLimit must be used within a ConversionLimitProvider');
  }
  return context;
};
