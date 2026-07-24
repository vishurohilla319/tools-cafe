import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lock, Sparkles, LogIn, UserPlus, CreditCard } from 'lucide-react';
import AuthModal from '../components/auth/AuthModal';
import PaymentModal from '../components/payment/PaymentModal';

interface ConversionLimitContextType {
  conversionCount: number;
  isLoggedIn: boolean;
  userPlan: string;
  showLimitModal: boolean;
  setShowLimitModal: (show: boolean) => void;
  openAuthModal: (mode?: 'login' | 'signup') => void;
  openPaymentModal: () => void;
}

const ConversionLimitContext = createContext<ConversionLimitContextType | undefined>(undefined);

let programmaticClickInProgress = false;

export const ConversionLimitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [modalType] = useState<'auth_required' | 'limit_reached'>('limit_reached');
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [conversionCount, setConversionCount] = useState(() => {
    const todayStr = getTodayStr();
    const lastDate = localStorage.getItem('tools_cafe_last_conversion_date');
    if (lastDate !== todayStr) {
      localStorage.setItem('tools_cafe_last_conversion_date', todayStr);
      localStorage.setItem('files_processed_count', '0');
      return 0;
    }
    const saved = localStorage.getItem('files_processed_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [userPlan, setUserPlan] = useState(() => localStorage.getItem('userPlan') || 'free');

  useEffect(() => {
    const handleStorageChange = () => {
      const todayStr = getTodayStr();
      const lastDate = localStorage.getItem('tools_cafe_last_conversion_date');
      
      if (lastDate !== todayStr) {
        localStorage.setItem('tools_cafe_last_conversion_date', todayStr);
        localStorage.setItem('files_processed_count', '0');
        setConversionCount(0);
      } else {
        const saved = localStorage.getItem('files_processed_count');
        setConversionCount(saved ? parseInt(saved, 10) : 0);
      }

      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
      setUserPlan(localStorage.getItem('userPlan') || 'free');
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const openPaymentModal = () => {
    setPaymentModalOpen(true);
  };

  const checkAndIncrementLimit = (): boolean => {
    const todayStr = getTodayStr();

    // Check date reset
    const lastDate = localStorage.getItem('tools_cafe_last_conversion_date');
    let count = 0;
    if (lastDate !== todayStr) {
      localStorage.setItem('tools_cafe_last_conversion_date', todayStr);
      localStorage.setItem('files_processed_count', '0');
      count = 0;
    } else {
      const saved = localStorage.getItem('files_processed_count');
      count = saved ? parseInt(saved, 10) : 0;
    }

    // Always allow conversions without mandatory login or daily limit
    localStorage.setItem('files_processed_count', String(count + 1));
    window.dispatchEvent(new Event('storage'));
    return true;
  };

  useEffect(() => {
    // 1. Intercept JSX links and element clicks
    const handleWindowClick = (e: MouseEvent) => {
      if (programmaticClickInProgress) {
        return;
      }

      let target = e.target as HTMLElement | null;
      while (target && target !== document.body) {
        if (target.tagName === 'A' && target.hasAttribute('download')) {
          if (!checkAndIncrementLimit()) {
            e.preventDefault();
            e.stopPropagation();
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

  return (
    <ConversionLimitContext.Provider
      value={{
        conversionCount,
        isLoggedIn,
        userPlan,
        showLimitModal,
        setShowLimitModal,
        openAuthModal,
        openPaymentModal,
      }}
    >
      {children}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* Global Payment Modal (₹100/mo) */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
      />

      {/* Glassmorphic Limit / Auth Alert Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full transform transition-all scale-100 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center">
            
            {/* Top color bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-600 via-indigo-500 to-violet-500" />

            {modalType === 'auth_required' ? (
              <>
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white mb-5">
                  <Lock className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2 font-heading">
                  Login Required to Process Files
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
                  Please Log In or Sign Up for free to get <strong>10 free conversions every day</strong>!
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowLimitModal(false);
                      openAuthModal('login');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Log In to Your Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowLimitModal(false);
                      openAuthModal('signup');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Free Account (10 Daily)</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-brand-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white mb-5">
                  <Sparkles className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2 font-heading">
                  Daily Limit Reached (10/10)
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
                  You have used all <strong>10 daily free conversions</strong> for today. Upgrade to Pro for <strong>₹100/month</strong> for Unlimited conversions!
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowLimitModal(false);
                      openPaymentModal();
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-700 hover:to-brand-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₹100 / Month for Unlimited</span>
                  </button>

                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    Wait Until Tomorrow
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => setShowLimitModal(false)}
              className="mt-4 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              Cancel
            </button>
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

export default ConversionLimitContext;
