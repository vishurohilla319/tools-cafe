import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, Search, Globe, User, LayoutDashboard, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { toolsList } from '../../utils/toolsList';
import Icon from '../ui/Icon';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || 'user');

  const searchRef = useRef<HTMLDivElement>(null);

  // Monitor auth status from local storage
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
      setUserRole(localStorage.getItem('userRole') || 'user');
    };
    window.addEventListener('storage', checkAuth);
    // Poll local storage periodically since events don't fire on same tab
    const interval = setInterval(checkAuth, 1000);
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
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    setIsLoggedIn(false);
    navigate('/');
  };

  const handleLoginSimulate = (role: 'user' | 'admin') => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', role);
    setIsLoggedIn(true);
    setUserRole(role);
    navigate(role === 'admin' ? '/admin' : '/dashboard');
  };

  return (
    <header className="sticky top-0 z-50 transition-colors duration-300 w-full border-b border-light-border dark:border-dark-border bg-white/80 dark:bg-dark-bg/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300">
                <Icon name="Printer" size={20} className="text-white" />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight bg-gradient-to-r from-brand-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                Tools Cafe
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-6 items-center">
            <Link to="/" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors">
              {t('nav.home')}
            </Link>
            <Link to="/tools" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors">
              {t('nav.allTools')}
            </Link>
            <Link to="/tools?category=pdf" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors">
              {t('nav.pdfTools')}
            </Link>
            <Link to="/tools?category=image" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors">
              {t('nav.imageTools')}
            </Link>
            <Link to="/pricing" className="text-sm font-medium hover:text-brand-600 text-slate-600 dark:text-slate-300 transition-colors">
              {t('nav.pricing')}
            </Link>
          </nav>

          {/* Search, Theme, Language, Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search Input */}
            <div ref={searchRef} className="relative w-64">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('home.searchPlaceholder').slice(0, 20) + '...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-500"
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
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Switch Language / भाषा बदलें"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 transition-colors"
              title="Theme Toggle"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Login / Dashboard Menu */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                {userRole === 'admin' ? (
                  <Link
                    to="/admin"
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-brand-500 transition-colors"
                    title={t('nav.admin')}
                  >
                    <Settings className="h-4.5 w-4.5" />
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-indigo-500 transition-colors"
                    title={t('nav.dashboard')}
                  >
                    <LayoutDashboard className="h-4.5 w-4.5" />
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Simulated Quick Login */}
                <button
                  onClick={() => handleLoginSimulate('user')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => handleLoginSimulate('admin')}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white shadow-md shadow-brand-600/10 transition-colors"
                >
                  {t('nav.signup')}
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
            {t('nav.pricing')}
          </Link>

          {isLoggedIn ? (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <Link
                to={userRole === 'admin' ? '/admin' : '/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                <User size={18} />
                <span>{userRole === 'admin' ? t('nav.admin') : t('nav.dashboard')}</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-500 hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLoginSimulate('user');
                }}
                className="flex-1 py-2 text-center rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
              >
                {t('nav.login')}
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLoginSimulate('admin');
                }}
                className="flex-1 py-2 text-center rounded-lg text-sm font-semibold bg-brand-600 text-white"
              >
                {t('nav.signup')}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
