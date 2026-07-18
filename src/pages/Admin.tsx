import React, { useState } from 'react';
import { Settings, Users, CreditCard, LayoutGrid, BarChart2 } from 'lucide-react';

export const Admin: React.FC = () => {
  const [bwPrice, setBwPrice] = useState(() => parseFloat(localStorage.getItem('bw_price') || '2.0'));
  const [colorPrice, setColorPrice] = useState(() => parseFloat(localStorage.getItem('color_price') || '10.0'));
  const [dailyFreeLimit, setDailyFreeLimit] = useState(() => parseInt(localStorage.getItem('daily_free_limit') || '10'));

  // Mock Admin statistics
  const stats = [
    { label: 'Total Operators', value: '1,424', change: '+12% this week', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Active Today', value: '412', change: '84% concurrency', icon: BarChart2, color: 'text-indigo-500 bg-indigo-500/10' },
    { label: 'Pro Subscriptions', value: '184', change: '₹36,616 MRR', icon: CreditCard, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Files Processed (Local)', value: '124,545', change: 'Zero server storage', icon: LayoutGrid, color: 'text-brand-500 bg-brand-500/10' }
  ];

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('bw_price', bwPrice.toString());
    localStorage.setItem('color_price', colorPrice.toString());
    localStorage.setItem('daily_free_limit', dailyFreeLimit.toString());
    alert('Settings successfully updated! Rates have been synced globally across Tools Cafe.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="pb-6 mb-8 border-b border-slate-100 dark:border-slate-800">
        <h1 className="font-heading text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>SaaS System Administration</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded">
            System Admin Panel
          </span>
        </h1>
        <p className="text-slate-450 dark:text-slate-400 text-xs mt-1">
          Monitor system metrics, update default printing prices, configure free limits, and inspect mock user lists.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const IconComp = stat.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm flex items-center gap-4.5"
            >
              <div className={`p-3 rounded-xl shrink-0 ${stat.color}`}>
                <IconComp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {stat.label}
                </span>
                <span className="font-heading text-xl font-extrabold text-slate-800 dark:text-slate-100 block mt-0.5">
                  {stat.value}
                </span>
                <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 block mt-0.5">
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left side - Configuration settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              <Settings size={16} className="text-brand-500" />
              <span>Config Defaults</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
              
              {/* Daily free limit */}
              <div className="space-y-1.5">
                <label>Daily Free Conversions Limit</label>
                <input
                  type="number"
                  value={dailyFreeLimit}
                  onChange={(e) => setDailyFreeLimit(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>

              {/* B&W print price */}
              <div className="space-y-1.5">
                <label>B&W Print Rate (per page)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.1"
                    value={bwPrice}
                    onChange={(e) => setBwPrice(parseFloat(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Color print price */}
              <div className="space-y-1.5">
                <label>Color Print Rate (per page)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    value={colorPrice}
                    onChange={(e) => setColorPrice(parseFloat(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-lg shadow-brand-600/10 transition-all hover:scale-[1.01] mt-6"
              >
                Save Settings Override
              </button>
            </form>
          </div>
        </div>

        {/* Right side - Operator management table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-sm">
            <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              <span>Simulated Operator Database</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-500 dark:text-slate-400">
                <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3">Shop / User</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Usage</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {[
                    { shopName: 'Raju Cyber Cafe (Mumbai)', plan: 'PRO', usage: '842 processed', status: 'Active' },
                    { shopName: 'CSC Center Bhopal', plan: 'PRO', usage: '1,204 processed', status: 'Active' },
                    { shopName: 'Sharma Print Shop', plan: 'FREE', usage: '9 processed', status: 'Over Limit' },
                    { shopName: 'Anjali Tax & Accounts', plan: 'PRO', usage: '211 processed', status: 'Active' },
                    { shopName: 'Kunal Verma (Student)', plan: 'FREE', usage: '3 processed', status: 'Active' }
                  ].map((user, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200">
                        {user.shopName}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                          user.plan === 'PRO'
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">{user.usage}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[8px] uppercase ${
                          user.status === 'Active'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-red-500/10 text-red-650 dark:text-red-400'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Admin;
