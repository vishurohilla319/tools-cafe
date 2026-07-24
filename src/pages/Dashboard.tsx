import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, ShieldCheck, Cpu, HardDrive, User, Sparkles, CreditCard, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoritesContext';
import { toolsList } from '../utils/toolsList';
import Icon from '../components/ui/Icon';
import { useConversionLimit } from '../context/ConversionLimitContext';
import { getCurrentUser } from '../components/auth/AuthModal';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { favorites } = useFavorites();
  const { conversionCount: processedCount, isLoggedIn, userPlan, openAuthModal, openPaymentModal } = useConversionLimit();
  
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_tools');
    if (saved) setRecentToolIds(JSON.parse(saved));
    setCurrentUser(getCurrentUser());
  }, [isLoggedIn, userPlan]);

  const handleResetLimits = () => {
    localStorage.setItem('files_processed_count', '0');
    window.dispatchEvent(new Event('storage'));
  };

  const favoriteTools = toolsList.filter((tool) => favorites.includes(tool.id));
  const recentTools = toolsList.filter((tool) => recentToolIds.includes(tool.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-8 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <User className="w-6 h-6 text-brand-600" />
            <span>Welcome, {currentUser ? currentUser.name : 'Guest User'}!</span>
          </h1>
          <p className="text-slate-450 dark:text-slate-400 text-xs mt-1">
            {currentUser?.email || 'Log in to track your 10 free daily conversions or upgrade to Pro.'}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <div className="flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 px-4 py-2 rounded-xl text-brand-650 dark:text-brand-400">
            <Cpu className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {userPlan === 'pro' ? 'Pro Operator (Unlimited)' : 'Free Tier (10/day)'}
            </span>
          </div>

          {userPlan !== 'pro' && (
            <button
              onClick={openPaymentModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-700 hover:to-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/10 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Upgrade ₹100/mo</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column - Stats & Plan Info */}
        <div className="space-y-6">
          {/* Usage Stats Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <HardDrive size={16} className="text-brand-500" />
              <span>Daily Conversion Usage</span>
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  <span>Conversions Today</span>
                  <span>{userPlan === 'pro' ? `${processedCount} / ∞` : `${processedCount} / 10`}</span>
                </div>
                
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      userPlan === 'pro'
                        ? 'bg-emerald-500'
                        : processedCount >= 10
                        ? 'bg-red-500'
                        : 'bg-brand-500'
                    }`}
                    style={{
                      width: userPlan === 'pro' ? '100%' : `${Math.min(100, (processedCount / 10) * 100)}%`,
                    }}
                  />
                </div>

                {userPlan !== 'pro' && processedCount >= 10 && (
                  <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold space-y-2">
                    <p className="text-[11px] leading-snug">
                      Daily limit reached (10/10 conversions completed today). Upgrade to Pro for <strong>₹100/month</strong> for Unlimited conversions!
                    </p>
                    <button
                      onClick={openPaymentModal}
                      className="w-full py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CreditCard size={13} />
                      <span>Upgrade for ₹100/mo</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>Resets daily at midnight</span>
                <button
                  onClick={handleResetLimits}
                  className="text-brand-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={10} />
                  <span>Reset Counter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Plan Settings Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Account & Subscription</span>
            </h3>

            <div className="text-xs space-y-3 font-semibold text-slate-650 dark:text-slate-350">
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                <span>Logged In Status:</span>
                <span className={isLoggedIn ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                  {isLoggedIn ? 'Logged In' : 'Guest'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                <span>Current Plan:</span>
                <span className="font-bold capitalize text-brand-600 dark:text-brand-400">
                  {userPlan === 'pro' ? 'Pro Unlimited (₹100/mo)' : 'Free (10 conversions/day)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Email:</span>
                <span className="text-slate-400 truncate max-w-[140px]">{currentUser?.email || 'N/A'}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {userPlan !== 'pro' ? (
                <button
                  onClick={openPaymentModal}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-700 hover:to-brand-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-brand-500/10"
                >
                  <Sparkles size={14} />
                  <span>Get Unlimited Pass (₹100/mo)</span>
                </button>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>Pro Unlimited Active</span>
                </div>
              )}

              {!isLoggedIn && (
                <button
                  onClick={() => openAuthModal('login')}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span>Log In to Account</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Favorites & Recents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Favorite Tools */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <span>Your Starred Tools ({favoriteTools.length})</span>
            </h3>

            {favoriteTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {favoriteTools.map((tool) => (
                  <Link
                    key={tool.id}
                    to={tool.route}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors flex items-center gap-3 group"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                      <Icon name={tool.icon} size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-500 transition-colors">
                        {t(tool.nameKey)}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                        {tool.category}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Starred tools will appear here. Go to any tool page and click the Star icon!
              </div>
            )}
          </div>

          {/* Recently Used */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" />
              <span>Recently Visited</span>
            </h3>

            {recentTools.length > 0 ? (
              <div className="space-y-2">
                {recentTools.map((tool) => (
                  <Link
                    key={tool.id}
                    to={tool.route}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors border border-slate-100 dark:border-slate-850"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <Icon name={tool.icon} size={15} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-250">
                        {t(tool.nameKey)}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {tool.category}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No recent activity. Start using tools from the homepage directory!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
