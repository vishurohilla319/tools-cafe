import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, ShieldCheck, Cpu, HardDrive } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoritesContext';
import { toolsList } from '../utils/toolsList';
import Icon from '../components/ui/Icon';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { favorites } = useFavorites();
  
  const [userPlan] = useState(() => localStorage.getItem('userPlan') || 'free');
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);
  const [processedCount, setProcessedCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('recent_tools');
    if (saved) setRecentToolIds(JSON.parse(saved));

    const count = parseInt(localStorage.getItem('files_processed_count') || '0', 10);
    setProcessedCount(count || 12); // Default mock count of 12 if none processed yet
  }, []);

  const handleResetLimits = () => {
    localStorage.setItem('files_processed_count', '0');
    setProcessedCount(0);
  };

  const favoriteTools = toolsList.filter((tool) => favorites.includes(tool.id));
  const recentTools = toolsList.filter((tool) => recentToolIds.includes(tool.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-8 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Welcome Back, Guest Operator!</span>
          </h1>
          <p className="text-slate-450 dark:text-slate-400 text-xs mt-1">
            Manage your daily workflow, view tool usage limits, and configure preferences.
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 sm:mt-0 bg-brand-500/10 border border-brand-500/20 px-4 py-2 rounded-xl text-brand-650 dark:text-brand-400">
          <Cpu className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {userPlan === 'pro' ? 'Pro Operator Active' : 'Free Operator'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column - Stats & Plan Info */}
        <div className="space-y-6">
          {/* Usage Stats Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <HardDrive size={16} className="text-brand-500" />
              <span>Usage Limits</span>
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  <span>Daily Conversions Used</span>
                  <span>{processedCount} / {userPlan === 'pro' ? '∞' : '10'}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      processedCount >= 10 && userPlan !== 'pro' ? 'bg-red-500' : 'bg-brand-500'
                    }`}
                    style={{ width: `${userPlan === 'pro' ? Math.min(100, (processedCount / 50) * 100) : Math.min(100, (processedCount / 10) * 100)}%` }}
                  />
                </div>
                {userPlan !== 'pro' && processedCount >= 10 && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1.5 leading-snug">
                    You have reached your free daily limit. Upgrade to Pro for unlimited usage!
                  </p>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>Calculated on your local device</span>
                <button onClick={handleResetLimits} className="text-brand-500 hover:underline">
                  Reset Counters
                </button>
              </div>
            </div>
          </div>

          {/* Plan Settings Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Subscription Info</span>
            </h3>

            <div className="text-xs space-y-3 font-semibold text-slate-650 dark:text-slate-350">
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                <span>Account Status:</span>
                <span className="text-green-500 font-bold">Active</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                <span>Plan Level:</span>
                <span className="font-bold capitalize">{userPlan}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Device Binding:</span>
                <span className="text-slate-400">Local Browser Only</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/pricing"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-100 text-white dark:text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Upgrade Plan</span>
              </Link>
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
