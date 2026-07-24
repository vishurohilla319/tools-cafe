import React from 'react';
import { Check, ShieldCheck, Sparkles, UserCheck, ExternalLink } from 'lucide-react';
import { useConversionLimit } from '../context/ConversionLimitContext';

export const Pricing: React.FC = () => {
  const { isLoggedIn, userPlan, openAuthModal, openPaymentModal } = useConversionLimit();
  const razorpayLink = 'https://razorpay.me/@vishaumohan';

  const handleProAction = () => {
    if (!isLoggedIn) {
      openAuthModal('signup');
    } else {
      openPaymentModal();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 relative">
      {/* Background decoration */}
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse-slow" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10 animate-pulse-slow" />

      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-brand-500/10 text-brand-650 dark:text-brand-400 border border-brand-500/20">
          Transparent Pricing
        </span>
        <h1 className="font-heading text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 mt-4">
          Choose Your Tools Pass
        </h1>
        <p className="text-slate-450 dark:text-slate-400 text-xs sm:text-sm mt-3">
          Get 10 free conversions every single day, or upgrade to Pro for ₹100/month for Unlimited conversions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        
        {/* FREE PLAN */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
          {userPlan !== 'pro' && (
            <div className="absolute top-4 right-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[9px] px-2 py-0.5 rounded">
              {isLoggedIn ? 'CURRENT PLAN' : 'FREE DEFAULT'}
            </div>
          )}
          
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-800 dark:text-slate-200">
              Free Daily Plan
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Perfect for students and occasional home printing users.
            </p>
            
            <div className="my-6">
              <span className="font-heading text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                ₹0
              </span>
              <span className="text-xs text-slate-400"> / forever</span>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 my-5" />

            <ul className="space-y-3.5 text-xs font-semibold text-slate-600 dark:text-slate-350">
              {[
                '10 file conversions per day',
                'Auto resets every calendar day',
                '100% secure client-side computation',
                'Standard rendering speed',
                'Standard document & PDF tools'
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => !isLoggedIn && openAuthModal('signup')}
            disabled={userPlan === 'free' && isLoggedIn}
            className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-250 transition-colors mt-8 disabled:opacity-50 cursor-pointer"
          >
            {isLoggedIn ? (userPlan === 'free' ? 'Active Plan' : 'Free Tier') : 'Sign Up for 10 Free Daily'}
          </button>
        </div>

        {/* PRO PLAN */}
        <div className="rounded-3xl border-2 border-brand-500 bg-white dark:bg-dark-card p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-brand-500 text-white font-bold text-[9px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md shadow-brand-500/10">
            <Sparkles className="w-2.5 h-2.5" />
            <span>UNLIMITED PASS</span>
          </div>

          <div>
            <h3 className="font-heading text-lg font-bold text-slate-800 dark:text-slate-200">
              Pro Unlimited Plan
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Optimized for cyber cafes, print centers, and power users.
            </p>

            <div className="my-6">
              <span className="font-heading text-3xl font-extrabold text-brand-600 dark:text-brand-400 font-heading">
                ₹100
              </span>
              <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold"> / month</span>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 my-5" />

            <ul className="space-y-3.5 text-xs font-semibold text-slate-650 dark:text-slate-300">
              {[
                'Unlimited daily file conversions',
                'No 10 conversion daily restriction',
                'Batch processing (multiple files at once)',
                'Priority background rendering speed',
                'Razorpay (razorpay.me/@vishaumohan) payment support',
                'No advertisement banners'
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 mt-8">
            <button
              onClick={handleProAction}
              className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer ${
                userPlan === 'pro'
                  ? 'bg-emerald-500 text-white cursor-default flex items-center justify-center gap-2'
                  : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white shadow-brand-650/10 hover:scale-[1.02]'
              }`}
            >
              {userPlan === 'pro' ? (
                <>
                  <UserCheck size={16} />
                  <span>Active Pro Unlimited</span>
                </>
              ) : isLoggedIn ? (
                'Upgrade to Pro for ₹100 / month'
              ) : (
                'Log In / Sign Up & Pay ₹100'
              )}
            </button>

            {userPlan !== 'pro' && (
              <a
                href={razorpayLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={13} className="text-brand-500" />
                <span>Direct Razorpay Link (razorpay.me/@vishaumohan)</span>
              </a>
            )}
          </div>
        </div>

      </div>

      <div className="text-center max-w-md mx-auto mt-12 bg-slate-500/5 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <p className="text-[10px] text-slate-450 dark:text-slate-400 leading-snug font-semibold text-left">
          <strong>Secure Razorpay Payment:</strong> Pay directly via <code>{razorpayLink}</code>. Upgrade anytime for ₹100/month to lift all daily conversion limits.
        </p>
      </div>
    </div>
  );
};

export default Pricing;
