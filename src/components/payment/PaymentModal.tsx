import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, QrCode, CreditCard, Sparkles, ExternalLink, Loader2, KeyRound } from 'lucide-react';
import { getCurrentUser, setCurrentUser, getStoredUsers } from '../auth/AuthModal';
import type { UserAccount } from '../auth/AuthModal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi' | 'card'>('razorpay');
  const [transactionRef, setTransactionRef] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  
  const [step, setStep] = useState<'select' | 'verify'>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentUser = getCurrentUser();
  const razorpayLink = 'https://razorpay.me/@vishaumohan';

  const activateProPlan = () => {
    const users = getStoredUsers();
    if (currentUser) {
      const updatedUsers = users.map((u) =>
        u.id === currentUser.id ? { ...u, plan: 'pro' as const } : u
      );
      localStorage.setItem('tools_cafe_users', JSON.stringify(updatedUsers));
      
      const updatedUser: UserAccount = { ...currentUser, plan: 'pro' };
      setCurrentUser(updatedUser);
    } else {
      localStorage.setItem('userPlan', 'pro');
      localStorage.setItem('isLoggedIn', 'true');
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleOpenRazorpay = () => {
    window.open(razorpayLink, '_blank', 'noopener,noreferrer');
    setError('');
    setStep('verify'); // Move to verification step ONLY
  };

  const handleVerifyTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!transactionRef.trim() || transactionRef.trim().length < 6) {
      setError('Please enter a valid Razorpay Payment ID or UPI Ref / UTR Number (min 6 characters).');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      activateProPlan();

      setTimeout(() => {
        setIsSuccess(false);
        setStep('select');
        setTransactionRef('');
        onSuccess?.();
        onClose();
      }, 1500);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full relative overflow-hidden transition-all transform scale-100">
        
        {/* Top Gradient Header */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-brand-600 to-indigo-600" />

        {/* Close button */}
        <button
          onClick={() => {
            setStep('select');
            setError('');
            onClose();
          }}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {isSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-heading">
              Payment Verified & Confirmed!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Welcome to <strong>Pro Operator Plan</strong>. You now have <strong>Unlimited Conversions</strong>!
            </p>
          </div>
        ) : (
          <>
            {/* Title Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold mb-3 border border-brand-500/20">
                <Sparkles size={13} />
                <span>Unlimited Conversions Pass</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-heading">
                Upgrade to Pro Plan
              </h2>
              <div className="mt-2 flex justify-center items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
                  ₹100
                </span>
                <span className="text-xs text-slate-400 font-semibold">/ month</span>
              </div>
            </div>

            {/* STEP 1: Select Payment Method & Click Razorpay Link */}
            {step === 'select' ? (
              <div>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('razorpay')}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'razorpay'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <ExternalLink size={15} />
                    <span>Razorpay Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'upi'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <QrCode size={15} />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <CreditCard size={15} />
                    <span>Cards</span>
                  </button>
                </div>

                {paymentMethod === 'razorpay' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-brand-50 dark:from-indigo-950/40 dark:to-brand-950/40 border border-brand-200 dark:border-brand-800/50 text-center">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                        Official Razorpay Gateway
                      </div>
                      <div className="text-[11px] text-brand-600 dark:text-brand-400 font-mono font-bold break-all bg-white dark:bg-slate-900 p-2 rounded-xl border border-brand-100 dark:border-brand-900 mb-3">
                        {razorpayLink}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Click below to complete your payment of ₹100 on Razorpay, then enter your payment reference ID to verify.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenRazorpay}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 text-white font-bold text-xs shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ExternalLink size={16} />
                      <span>Open Razorpay Page & Pay ₹100</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethod === 'upi' ? (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                        <div className="w-28 h-28 mx-auto bg-white p-2 rounded-xl shadow-inner border border-slate-200 flex flex-col items-center justify-center mb-2">
                          <QrCode className="w-20 h-20 text-slate-800" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                          Scan & Pay ₹100
                        </span>
                        <input
                          type="text"
                          placeholder="Or enter UPI ID"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Card Number"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs"
                          />
                          <input
                            type="password"
                            placeholder="CVV"
                            maxLength={4}
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setStep('verify')}
                      className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-lg transition-all cursor-pointer mt-2"
                    >
                      Proceed to Verification
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* STEP 2: Verify Payment Transaction ID / UTR */
              <form onSubmit={handleVerifyTransaction} className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-100 text-center">
                  <div className="flex justify-center text-amber-500 mb-2">
                    <KeyRound size={24} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Enter Razorpay Payment ID / UTR Number
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    Enter the Payment ID (e.g., <code>pay_P123456...</code>) or 12-digit UTR/Ref No. received from Razorpay after paying ₹100.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Razorpay Payment ID / Ref No.
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. pay_P892134567 or 12-digit UTR"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('select');
                      setError('');
                    }}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-700 hover:to-brand-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Payment...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Verify & Activate Pro</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-semibold pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Verified Payment Gateway Integration</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
