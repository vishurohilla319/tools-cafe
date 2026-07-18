import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { toolsList, categoriesList } from '../utils/toolsList';
import Icon from '../components/ui/Icon';

export const AllTools: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const activeCategory = searchParams.get('category') || 'all';

  // Clear query if category changes
  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', categoryId);
    }
    setSearchParams(searchParams);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter tools based on search and category
  const displayedTools = toolsList.filter((tool) => {
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    
    const translatedName = t(tool.nameKey).toLowerCase();
    const translatedDesc = t(tool.descKey).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = translatedName.includes(query) || translatedDesc.includes(query) || tool.id.includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="text-center md:text-left mb-8">
        <h1 className="font-heading text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-center md:justify-start gap-2">
          <span>All Digital & Print Tools</span>
          <Sparkles className="w-5 h-5 text-brand-500 animate-pulse" />
        </h1>
        <p className="text-slate-450 dark:text-slate-400 text-xs mt-1">
          Explore our complete directory of offline-first document, photo, and design tools.
        </p>
      </div>

      {/* Control bar: Search and Filter Pills */}
      <div className="space-y-4 mb-8">
        {/* Search */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search for tools by name, utility or extension (e.g. merge, compress, jpg)..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => handleCategorySelect('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
              activeCategory === 'all'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-650/10'
                : 'bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
            }`}
          >
            All Categories
          </button>
          
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-650/10'
                  : 'bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
              }`}
            >
              <Icon name={cat.icon} size={12} />
              <span>{t(cat.nameKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      {displayedTools.length > 0 ? (
        <div className="tools-grid">
          {displayedTools.map((tool) => (
            <Link
              key={tool.id}
              to={tool.route}
              className="group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card hover:-translate-y-1 transition-all duration-300 hover:shadow-xl shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                    <Icon name={tool.icon} size={18} />
                  </div>
                  {tool.isClientSide ? (
                    <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                      LOCAL
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      SERVER
                    </span>
                  )}
                </div>

                <h3 className="font-heading text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-500 transition-colors">
                  {t(tool.nameKey)}
                </h3>

                <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1.5 line-clamp-2 leading-relaxed">
                  {t(tool.descKey)}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-bold text-brand-500 mt-4 group-hover:gap-1.5 transition-all">
                <span>Start</span>
                <ArrowRight size={10} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto mt-12 bg-slate-50/50 dark:bg-dark-card/50">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-4" />
          <h3 className="font-heading text-xs font-bold text-slate-700 dark:text-slate-200">No tools found</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
            We couldn't find any tools matching your filters. Try checking your search spelling or clearing the category filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              handleCategorySelect('all');
            }}
            className="mt-4 px-4 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 text-[10px] font-bold hover:scale-105 transition-all"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default AllTools;
