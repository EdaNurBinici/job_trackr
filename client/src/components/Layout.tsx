import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useState } from 'react';
import InstallButton from './InstallButton';
import Icon from './Icon';
export const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, tx } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: 'chart' },
    { to: '/applications', label: tx('Başvurular', 'Applications'), icon: 'note' },
    { to: '/cv', label: tx('CV Yönetimi', 'My CVs'), icon: 'doc' },
    { to: '/cv-analysis', label: tx('AI Analiz', 'AI Analysis'), icon: 'bot' },
    { to: '/analysis-history', label: tx('Geçmiş', 'History'), icon: 'history' },
    { to: '/cover-letter-generator', label: tx('Ön Yazı', 'Cover Letter'), icon: 'pen' },
    { to: '/cover-letters', label: tx('Ön Yazılarım', 'My Letters'), icon: 'clipboard' },
  ];
  return (
    <div className="min-h-screen flex flex-col">
      {}
      <nav className="bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {}
            <Link 
              to="/dashboard" 
              className="flex items-center space-x-2 group -ml-2"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                <span className="text-white text-xl font-bold">JT</span>
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent hidden sm:block">
                JobTrackr
              </span>
            </Link>
            {}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-2.5 xl:px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                    isActive(link.to)
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon name={link.icon} />
                  <span className="hidden xl:inline">{link.label}</span>
                </Link>
              ))}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-2.5 xl:px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                    isActive('/admin')
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon name="settings" />
                  <span className="hidden xl:inline">Admin</span>
                </Link>
              )}
            </div>
            {}
            <div className="hidden md:flex items-center space-x-4">
              {}
              <button
                onClick={toggleLanguage}
                className="px-2.5 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 transition-all duration-200"
                aria-label={language === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
                title={language === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
              >
                {language === 'tr' ? 'EN' : 'TR'}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 transition-all duration-200"
                aria-label="Toggle Dark Mode"
              >
                {theme === 'light' ? <Icon name="moon" /> : <Icon name="sun" />}
              </button>
              <div className="flex items-center space-x-3 pl-2 pr-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden min-[1750px]:inline max-w-[220px] truncate text-sm font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="whitespace-nowrap px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
              >
                {tx('Çıkış', 'Log out')}
              </button>
            </div>
            {}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={toggleLanguage}
                className="px-2.5 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-white/5"
                aria-label={language === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
              >
                {language === 'tr' ? 'EN' : 'TR'}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 transition-all duration-200"
                aria-label="Toggle Dark Mode"
              >
                {theme === 'light' ? <Icon name="moon" /> : <Icon name="sun" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          {}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200 dark:border-white/10">
              <div className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive(link.to)
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="mr-3"><Icon name={link.icon} /></span>
                    {link.label}
                  </Link>
                ))}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive('/admin')
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="mr-3"><Icon name="settings" /></span>
                    Admin
                  </Link>
                )}
              </div>
              {}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                {}
                <div className="px-4 mb-3">
                  <InstallButton />
                </div>
                <div className="flex items-center space-x-3 px-4 py-2 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                >
                  {tx('Çıkış Yap', 'Log out')}
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
      {}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>
      {}
      <footer className="border-t border-slate-200/70 dark:border-white/10 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            © 2026 JobTrackr. {tx('Tüm hakları saklıdır.', 'All rights reserved.')}
          </div>
        </div>
      </footer>
    </div>
  );
};
