import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, LogIn, UserPlus, CheckCircle2, MailCheck, Loader2, KeyRound } from 'lucide-react';
import { signUpWithEmail, signInWithEmail, sendPasswordResetEmail, resetUserPassword } from '../../utils/supabaseClient';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  plan: 'free' | 'pro';
  role: 'user' | 'admin';
  createdAt: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot_password' | 'reset_password';
  onSuccess?: (user: UserAccount) => void;
}

export const getStoredUsers = (): UserAccount[] => {
  const saved = localStorage.getItem('tools_cafe_users');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return [];
};

export const getCurrentUser = (): UserAccount | null => {
  const saved = localStorage.getItem('tools_cafe_current_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};

export const setCurrentUser = (user: UserAccount | null) => {
  if (user) {
    localStorage.setItem('tools_cafe_current_user', JSON.stringify(user));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userPlan', user.plan);
  } else {
    localStorage.removeItem('tools_cafe_current_user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPlan');
  }
  window.dispatchEvent(new Event('storage'));
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password' | 'reset_password'>(initialMode);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [emailSentNotice, setEmailSentNotice] = useState<string | null>(null);

  // Auto detect recovery token in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery') && hash.includes('access_token=')) {
      const match = hash.match(/access_token=([^&]+)/);
      if (match && match[1]) {
        setAccessToken(match[1]);
        setMode('reset_password');
      }
    }
  }, []);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setSuccessMsg('');
    setEmailSentNotice(null);
  }, [initialMode, isOpen]);

  if (!isOpen && mode !== 'reset_password') return null;
  const isModalVisible = isOpen || mode === 'reset_password';
  if (!isModalVisible) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    const { data: supaData, error: supaErr } = await signInWithEmail(email.trim(), password);

    if (supaErr) {
      const users = getStoredUsers();
      const foundUser = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase().trim()
      );

      if (!foundUser) {
        setError(supaErr);
        setIsLoading(false);
        return;
      }

      if (foundUser.password && foundUser.password !== password) {
        setError('Incorrect password. Click "Forgot Password?" below to reset!');
        setIsLoading(false);
        return;
      }

      setCurrentUser(foundUser);
      setSuccessMsg('Login successful!');
      setIsLoading(false);
      setTimeout(() => {
        onSuccess?.(foundUser);
        onClose();
      }, 400);
      return;
    }

    const supaUser = supaData?.user;
    const loggedUser: UserAccount = {
      id: supaUser?.id || `usr_${Date.now()}`,
      name: supaUser?.user_metadata?.full_name || email.split('@')[0],
      email: email.toLowerCase().trim(),
      plan: 'free',
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    setCurrentUser(loggedUser);
    setSuccessMsg('Login successful!');
    setIsLoading(false);
    setTimeout(() => {
      onSuccess?.(loggedUser);
      onClose();
    }, 400);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setEmailSentNotice(null);
    setIsLoading(true);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match!');
      setIsLoading(false);
      return;
    }

    const { error: supaErr } = await signUpWithEmail(email.trim(), password, name.trim());

    if (supaErr) {
      setError(supaErr);
      setIsLoading(false);
      return;
    }

    const users = getStoredUsers();
    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      plan: 'free',
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    if (!users.some((u) => u.email.toLowerCase() === newUser.email)) {
      users.push(newUser);
      localStorage.setItem('tools_cafe_users', JSON.stringify(users));
    }

    setIsLoading(false);
    setEmailSentNotice(email.trim());
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!email.trim()) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    // Call Supabase recovery email API
    const { error: supaErr } = await sendPasswordResetEmail(email.trim());

    setIsLoading(false);

    if (supaErr) {
      setError(supaErr);
      return;
    }

    setSuccessMsg(`Password reset link sent to ${email.trim()}! Please check your email inbox.`);
    setEmailSentNotice(email.trim());
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    setIsLoading(true);

    if (accessToken) {
      const { error: supaErr } = await resetUserPassword(accessToken, password);
      if (supaErr) {
        setError(supaErr);
        setIsLoading(false);
        return;
      }
    }

    // Update local stored user if exists
    const users = getStoredUsers();
    const updatedUsers = users.map((u) =>
      u.email.toLowerCase() === email.toLowerCase().trim() ? { ...u, password } : u
    );
    localStorage.setItem('tools_cafe_users', JSON.stringify(updatedUsers));

    setIsLoading(false);
    setSuccessMsg('Password changed successfully! You can now log in with your new password.');
    setTimeout(() => {
      window.location.hash = '';
      setMode('login');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full relative overflow-hidden transition-all transform scale-100">
        
        {/* Top Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-600 via-indigo-500 to-violet-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        {emailSentNotice ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center animate-bounce">
              <MailCheck size={36} />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-heading">
              {mode === 'forgot_password' ? 'Password Reset Email Sent!' : 'Confirmation Link Sent!'}
            </h3>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                {mode === 'forgot_password'
                  ? 'We have sent a password reset link to:'
                  : 'We have sent a confirmation email link to:'}
              </p>
              <p className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono mt-1 underline">
                {emailSentNotice}
              </p>
              <p className="text-[11px] text-slate-400 mt-3 leading-snug">
                Please check your email inbox (and spam folder) and click on the link to proceed!
              </p>
            </div>
            
            <button
              onClick={() => {
                setEmailSentNotice(null);
                setMode('login');
              }}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              Back to Log In
            </button>
          </div>
        ) : (
          <>
            {/* Header Title */}
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white mb-3">
                {mode === 'login' && <LogIn className="w-6 h-6" />}
                {mode === 'signup' && <UserPlus className="w-6 h-6" />}
                {mode === 'forgot_password' && <KeyRound className="w-6 h-6" />}
                {mode === 'reset_password' && <Lock className="w-6 h-6" />}
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-heading">
                {mode === 'login' && 'Log In to Tools Cafe'}
                {mode === 'signup' && 'Create Your Account'}
                {mode === 'forgot_password' && 'Reset Your Password'}
                {mode === 'reset_password' && 'Set New Password'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {mode === 'login' && 'Log in to access your 10 daily free conversions'}
                {mode === 'signup' && 'Sign up to receive a confirmation link on your email!'}
                {mode === 'forgot_password' && 'Enter your email to receive a password reset link'}
                {mode === 'reset_password' && 'Enter your new password below'}
              </p>
            </div>

            {/* Mode Switcher Tabs (Login / Signup) */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold leading-relaxed">
                {error}
              </div>
            )}

            {/* Success Alert */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setError('');
                      }}
                      className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.01] cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Log In</span>
                </button>
              </form>
            )}

            {/* SIGNUP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-brand-600/20 transition-all hover:scale-[1.01] cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Send Confirmation Link</span>
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot_password' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Account Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    Back to Login
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>Send Reset Link</span>
                  </button>
                </div>
              </form>
            )}

            {/* RESET NEW PASSWORD FORM */}
            {mode === 'reset_password' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-700 hover:to-brand-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save New Password</span>
                </button>
              </form>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default AuthModal;
