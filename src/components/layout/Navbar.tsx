import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import {
  ShieldCheck,
  Search,
  KeyRound,
  Sun,
  Moon,
  Lock,
  LogOut,
  User,
  Settings as SettingsIcon,
  Plus,
  Zap,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    isAuthenticated,
    securityStats,
    theme,
    setTheme,
    setSearchModalOpen,
    openCreatePasswordModal,
    setGeneratorModalOpen,
    openAuthModal,
    logout,
    setActiveTab,
  } = useVault();

  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (score >= 60) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (score >= 40) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between transition-colors">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/30">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight glow-text">ShieldVault</span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 rounded-md uppercase">
              Pro SaaS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 -mt-0.5">Zero-Knowledge Vault</p>
        </div>
      </div>

      {/* Global Master Search Bar Trigger */}
      {isAuthenticated && (
        <button
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center justify-between gap-3 px-3.5 py-2 w-64 md:w-80 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-900/60 text-slate-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-200/50 dark:hover:bg-zinc-800/80 transition-all text-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <span>Search vault, URLs, tags...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 dark:text-zinc-400 bg-slate-200 dark:bg-zinc-800 rounded border border-slate-300 dark:border-zinc-700">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Security Health Score Badge */}
        {isAuthenticated && securityStats && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${getScoreColor(
              securityStats.overallScore
            )}`}
            title="Overall Vault Security Health Score"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Vault Score: {securityStats.overallScore}%</span>
          </button>
        )}

        {/* Quick Password Generator Trigger */}
        {isAuthenticated && (
          <button
            onClick={() => setGeneratorModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-medium transition-all"
            title="Generate Secure Password"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Generator</span>
          </button>
        )}

        {/* Add Password Primary CTA */}
        {isAuthenticated && (
          <button
            onClick={openCreatePasswordModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Password</span>
          </button>
        )}

        {/* Theme Switcher Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-all"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* User Account / Auth Dropdown */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all focus:outline-none"
            >
              <img
                src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                alt={user.fullName}
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/30"
              />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-2 z-50 transition-all text-xs"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800/80 mb-1">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{user.fullName}</p>
                  <p className="text-slate-500 dark:text-zinc-400 truncate">{user.email}</p>
                </div>

                <button
                  onClick={() => setActiveTab('settings')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                  <span>Vault Settings</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                  <span>Security & 2FA</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Lock Vault & Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
