import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';

interface ToolHeaderProps {
  toolId: string;
  title: string;
  description: string;
  category: string;
  categoryName: string;
  isClientSide?: boolean;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({
  toolId,
  title,
  description,
  category,
  categoryName,
  isClientSide = true
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(toolId);

  return (
    <div className="w-full border-b border-slate-100 dark:border-slate-800/80 pb-6 mb-8 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Breadcrumb / Back button */}
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400">
            <Link to="/tools" className="hover:text-brand-500 transition-colors">
              Tools
            </Link>
            <span>/</span>
            <Link to={`/tools?category=${category}`} className="hover:text-brand-500 transition-colors">
              {categoryName}
            </Link>
          </div>

          <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            {title}
            <button
              onClick={() => toggleFavorite(toolId)}
              className="text-slate-300 hover:text-amber-500 transition-colors focus:outline-none"
              title={fav ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star className={`w-6 h-6 ${fav ? 'text-amber-500 fill-amber-500' : ''}`} />
            </button>
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 max-w-2xl leading-relaxed">
            {description}
          </p>
        </div>

        {/* Security / Privacy Badges */}
        <div className="flex flex-row sm:flex-col items-start gap-2 sm:items-end justify-start sm:justify-center">
          {isClientSide ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SECURE LOCAL PROCESSING</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SERVER PROCESSING REQUIRED</span>
            </div>
          )}

          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-850 px-2.5 py-1 rounded-lg">
            {categoryName}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolHeader;
