import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, Search, Globe, User, LogOut, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useConversionLimit } from '../../context/ConversionLimitContext';
import { getCurrentUser, setCurrentUser } from '../auth/AuthModal';
import type { UserAccount } from '../auth/AuthModal';
import { toolsList } from '../../utils/toolsList';
import Icon from '../ui/Icon';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { openAuthModal, openPaymentModal, userPlan } = useConversionLimit();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const [currentUser, setLocalCurrentUser] = useState<UserAccount | null>(getCurrentUser());
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');

  const searchRef = useRef<HTMLDivElement>(null);

  // Monitor auth status from local storage
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
      setLocalCurrentUser(getCurrentUser());
    };
    window.addEventListener('storage', checkAuth);
    const interval = setInterval(checkAuth, 500);
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);

  // Filter tools based on query
  const filteredTools = searchQuery.trim()
    ? toolsList.filter((tool) => {
        const translatedName = t(tool.nameKey).toLowerCase();
        const translatedDesc = t(tool.descKey).toLowerCase();
        const query = searchQuery.toLowerCase();
        return translatedName.includes(query) || translatedDesc.includes(query) || tool.id.includes(query);
      })
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSelect = (route: string) => {
    setSearchQuery('');
    setShowSearchResults(false);
    navigate(route);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setLocalCurrentUser(null);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 transition-colors duration-300 w-full border-b border-light-border dark:border-dark-border bg-white/80 dark:bg-dark-bg/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center gap-2 group whitespace-nowrap shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
                <Icon name="Printer" size={20} className="text-white" />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight bg-gradient-to-r from-brand-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent whitespace-nowrap">
                Tools Cafe
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-3 lg:space-x-6 items-center shrink-0">
            <Link to="/" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap">
              {t('nav.home')}
            </Link>
            <Link to="/tools" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap">
              {t('nav.allTools')}
            </Link>
            <Link to="/tools?category=pdf" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap">
              {t('nav.pdfTools')}
            </Link>
            <Link to="/tools?category=image" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap">
              {t('nav.imageTools')}
            </Link>
            <Link to="/pricing" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 whitespace-nowrap">
              <span>{t('nav.pricing')}</span>
              <span className="bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                ₹100/mo
              </span>
            </Link>
          </nav>

          {/* Search, Theme, Language, Actions */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4 shrink-0">
            {/* Search Input */}
            <div ref={searchRef} className="relative w-36 lg:w-60 shrink">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('home.searchPlaceholder').slice(0, 16) + '...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-500"
                />
              </div>

              {/* Search Dropdown */}
              {showSearchResults && filteredTools.length > 0 && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card shadow-2xl p-2 z-50">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/50">
                    Matches ({filteredTools.length})
                  </div>
                  {filteredTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleSearchSelect(tool.route)}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
                        <Icon name={tool.icon} size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {t(tool.nameKey)}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          {t(tool.descKey)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="p-1.5 lg:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 transition-colors flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0"
              title="Switch Language / भाषा बदलें"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'en' ? 'HI' : 'EN'}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 lg:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 transition-colors shrink-0"
              title="Theme Toggle"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* User Auth Section */}
            {isLoggedIn && currentUser ? (
              <div className="flex items-center gap-2 shrink-0">
                {/* Upgrade Button if Free user */}
                {userPlan !== 'pro' && (
                  <button
                    onClick={openPaymentModal}
                    className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-600 hover:from-amber-600 hover:to-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/10 hover:scale-[1.02] transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Sparkles size={13} />
                    <span>Upgrade ₹100</span>
                  </button>
                )}

                <Link
                  to={currentUser.role === 'admin' ? '/admin' : '/dashboard'}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 shrink-0"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="text-left leading-tight shrink-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block max-w-[80px] lg:max-w-[100px] truncate whitespace-nowrap">
                      {currentUser.name}
                    </span>
                    <span className="text-[9px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider block whitespace-nowrap">
                      {userPlan === 'pro' ? 'Pro' : 'Free (10/d)'}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-1.5 lg:p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                  title="Log Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Log In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-bold text-white shadow-md shadow-brand-600/10 hover:scale-[1.02] transition-all cursor-pointer whitespace-nowrap"
                >
                  Sign Up Free
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="p-2 rounded-lg text-slate-500 text-xs font-semibold flex items-center"
            >
              <Globe className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-500 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-dark-bg px-4 pt-2 pb-4 space-y-2">
          {/* Mobile Search */}
          <div className="relative my-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none"
            />
            {searchQuery.trim() && filteredTools.length > 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card p-1">
                {filteredTools.slice(0, 5).map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSearchSelect(tool.route);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    <Icon name={tool.icon} size={14} />
                    <span>{t(tool.nameKey)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/tools"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
          >
            {t('nav.allTools')}
          </Link>
          <Link
            to="/tools?category=pdf"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
          >
            {t('nav.pdfTools')}
          </Link>
          <Link
            to="/tools?category=image"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
          >
            {t('nav.imageTools')}
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
          >
            {t('nav.pricing')} (₹100/mo)
          </Link>

          {isLoggedIn && currentUser ? (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="px-3 py-1 font-bold text-xs text-brand-600 dark:text-brand-400">
                Logged in as {currentUser.name} ({userPlan === 'pro' ? 'Pro' : 'Free 10/day'})
              </div>
              <Link
                to={currentUser.role === 'admin' ? '/admin' : '/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                <User size={18} />
                <span>{currentUser.role === 'admin' ? t('nav.admin') : t('nav.dashboard')}</span>
              </Link>
              {userPlan !== 'pro' && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openPaymentModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2"
                >
                  <Sparkles size={18} />
                  <span>Upgrade to Pro (₹100/mo)</span>
                </button>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-500 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2"
              >
                <LogOut size={18} />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('login');
                }}
                className="flex-1 py-2 text-center rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('signup');
                }}
                className="flex-1 py-2 text-center rounded-lg text-sm font-semibold bg-brand-600 text-white"
              >
                Sign Up Free
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
