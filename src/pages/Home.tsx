import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, Shield, Zap, Lock, Star, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoritesContext';
import { toolsList, categoriesList } from '../utils/toolsList';
import Icon from '../components/ui/Icon';

export const Home: React.FC = () => {
  const { t } = useLanguage();
  const { favorites } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);

  // Load recently used tools from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent_tools');
    if (saved) {
      setRecentToolIds(JSON.parse(saved));
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter tools based on search
  const filteredTools = searchQuery.trim()
    ? toolsList.filter((tool) => {
        const name = t(tool.nameKey).toLowerCase();
        const desc = t(tool.descKey).toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || desc.includes(query) || tool.id.includes(query);
      })
    : [];

  const popularTools = toolsList.filter((tool) => tool.isPopular);
  const favoriteTools = toolsList.filter((tool) => favorites.includes(tool.id));
  const recentTools = toolsList.filter((tool) => recentToolIds.includes(tool.id)).slice(0, 4);

  return (
    <div className="w-full relative py-6">
      
      {/* Background ambient glow shapes */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow -z-10" />
      <div className="absolute top-40 right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow -z-10" />

      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto px-4 pt-10 pb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-6 border border-brand-500/25 animate-bounce-slow">
          <Sparkles className="w-3.5 h-3.5" />
          <span>100% Secure & Client-Side Digital Tools</span>
        </div>
        
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 leading-none">
          {t('hero.title').split(' ').slice(0, -3).join(' ')}{' '}
          <span className="bg-gradient-to-r from-brand-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
            {t('hero.title').split(' ').slice(-3).join(' ')}
          </span>
        </h1>

        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-6 max-w-2xl mx-auto leading-relaxed font-medium">
          {t('hero.subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link
            to="/tools"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-600/20 hover:scale-105 transition-all flex items-center justify-center gap-2 group"
          >
            <span>{t('hero.cta.explore')}</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#why-privacy"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Shield size={16} className="text-emerald-500" />
            <span>How it works</span>
          </a>
        </div>
      </section>

      {/* Global Interactive Search */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <div className="relative">
          <Search className="absolute left-4 top-4 h-5.5 w-5.5 text-slate-400" />
          <input
            type="text"
            placeholder={t('home.searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-500 shadow-xl"
          />
        </div>

        {/* Search Results Display */}
        {searchQuery.trim() && (
          <div className="mt-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-4 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
              Found {filteredTools.length} results
            </h3>
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredTools.map((tool) => (
                  <Link
                    key={tool.id}
                    to={tool.route}
                    className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors"
                  >
                    <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
                      <Icon name={tool.icon} size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{t(tool.nameKey)}</div>
                      <div className="text-[10px] text-slate-450 dark:text-slate-400 line-clamp-1">{t(tool.descKey)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No tools match your query. Try searching for "PDF" or "JPG".
              </div>
            )}
          </div>
        )}
      </section>

      {/* Favorites Section (conditional) */}
      {favoriteTools.length > 0 && !searchQuery.trim() && (
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100">
              Your Favourite Tools
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {favoriteTools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.route}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-3.5 group"
              >
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                  <Icon name={tool.icon} size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-500 transition-colors">
                    {t(tool.nameKey)}
                  </h3>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {tool.category} Tool
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently Used (conditional) */}
      {recentTools.length > 0 && !searchQuery.trim() && (
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h2 className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100">
              Recently Used
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recentTools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.route}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-dark-card/50 hover:bg-white dark:hover:bg-dark-card hover:-translate-y-1 transition-all duration-300 shadow-sm flex items-center gap-3"
              >
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350">
                  <Icon name={tool.icon} size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-250">
                    {t(tool.nameKey)}
                  </h3>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {tool.category}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Popular Tools Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="text-center md:text-left mb-8">
          <h2 className="font-heading text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            {t('home.popularTools')}
          </h2>
          <p className="text-slate-450 dark:text-slate-400 text-xs mt-1">
            {t('home.popularSubtitle')}
          </p>
        </div>

        <div className="tools-grid">
          {popularTools.map((tool) => (
            <Link
              key={tool.id}
              to={tool.route}
              onClick={() => {
                // Add to recent tools list
                const updated = [tool.id, ...recentToolIds.filter((id) => id !== tool.id)].slice(0, 4);
                localStorage.setItem('recent_tools', JSON.stringify(updated));
              }}
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card hover:-translate-y-1.5 transition-all duration-300 hover:shadow-xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                    <Icon name={tool.icon} size={22} />
                  </div>
                  {tool.isClientSide && (
                    <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
                      LOCAL
                    </span>
                  )}
                </div>
                
                <h3 className="font-heading text-sm font-bold text-slate-855 dark:text-slate-100 group-hover:text-brand-500 transition-colors">
                  {t(tool.nameKey)}
                </h3>
                
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-2 line-clamp-2 leading-relaxed">
                  {t(tool.descKey)}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-brand-500 mt-4 group-hover:gap-1.5 transition-all">
                <span>Use Tool</span>
                <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="text-center md:text-left mb-8">
          <h2 className="font-heading text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-bold">
            {t('home.categories')}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4">
          {categoriesList.map((cat) => (
            <Link
              key={cat.id}
              to={`/tools?category=${cat.id}`}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-dark-card/70 hover:bg-white dark:hover:bg-dark-card hover:scale-[1.03] transition-all text-center flex flex-col items-center justify-center gap-2 group shadow-sm"
            >
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:text-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/30 text-slate-500 dark:text-slate-400 transition-colors">
                <Icon name={cat.icon} size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block leading-tight">
                {t(cat.nameKey)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Client-Side Processing Section */}
      <section id="why-privacy" className="max-w-7xl mx-auto px-4 pb-12 scroll-mt-20">
        <div className="rounded-3xl border border-slate-250/20 dark:border-dark-border bg-slate-50/50 dark:bg-[#06070a] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center justify-between shadow-sm">
          
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Lock className="w-3.5 h-3.5" />
              <span>PRIVACY FIRST ARCHITECTURE</span>
            </div>
            
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {t('home.whyClientSide')}
            </h2>
            
            <p className="text-slate-500 dark:text-slate-450 text-xs sm:text-sm leading-relaxed">
              We believe your personal documents and files belong to you. Standard web applications require uploading your files to their servers, exposing your data and causing slow upload speeds.
            </p>
            
            <p className="text-slate-500 dark:text-slate-455 text-xs sm:text-sm leading-relaxed">
              <strong>Tools Cafe</strong> runs heavy processing algorithms (using Canvas, WebAssembly, and native JS decoders) directly inside your web browser. Your files are never uploaded, keeping them private, safe, and lightning fast.
            </p>
          </div>

          {/* Grid of features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:max-w-md shrink-0">
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">100% Privacy</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">No server uploads means no data storage risk.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Zero Wait Time</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">Files compile instantly without slow internet uploads.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-500">
                <Icon name="ServerOff" size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Offline Capability</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">Once loaded, most tools work completely offline.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Icon name="Coins" size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Free to Use</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">No heavy server costs mean higher limits for free users.</p>
              </div>
            </div>
          </div>
          
        </div>
      </section>
      
    </div>
  );
};

export default Home;
