import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import {
  LayoutDashboard,
  KeyRound,
  Star,
  FolderKanban,
  Zap,
  ShieldAlert,
  History,
  Trash2,
  Settings,
  Plus,
  Lock,
  Briefcase,
  User,
  Share2,
  CreditCard,
  ShoppingBag,
  Code,
  Film,
  Folder,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedCategory,
    setSelectedCategory,
    categories,
    passwords,
    securityStats,
    setGeneratorModalOpen,
    setCheckerModalOpen,
    createCategory,
  } = useVault();

  const [newCatName, setNewCatName] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'briefcase': return <Briefcase className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'share2': return <Share2 className="w-4 h-4" />;
      case 'creditcard': return <CreditCard className="w-4 h-4" />;
      case 'shoppingbag': return <ShoppingBag className="w-4 h-4" />;
      case 'code': return <Code className="w-4 h-4" />;
      case 'film': return <Film className="w-4 h-4" />;
      default: return <Folder className="w-4 h-4" />;
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await createCategory(newCatName.trim(), 'Folder', 'bg-indigo-500');
    setNewCatName('');
    setShowCatInput(false);
  };

  const totalActiveCount = passwords.filter((p) => !p.isDeleted).length;
  const favoriteCount = passwords.filter((p) => !p.isDeleted && p.isFavorite).length;
  const trashCount = passwords.filter((p) => p.isDeleted).length;

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)] transition-colors">
      <div className="space-y-6">
        {/* Main Navigation */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
            Vault Overview
          </p>
          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setSelectedCategory('All');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('All');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'all' && selectedCategory === 'All'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4" />
                <span>All Passwords</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] rounded-md font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50">
                {totalActiveCount}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('favorites');
                setSelectedCategory('All');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'favorites'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-500" />
                <span>Favorites</span>
              </div>
              {favoriteCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-md font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {favoriteCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Categories Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              Categories
            </p>
            <button
              onClick={() => setShowCatInput((prev) => !prev)}
              className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
              title="Add Custom Category"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showCatInput && (
            <form onSubmit={handleAddCategory} className="px-2 mb-2">
              <input
                type="text"
                placeholder="New Category..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-indigo-500/50 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
              />
            </form>
          )}

          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const isCatActive = activeTab === 'all' && selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveTab('all');
                    setSelectedCategory(cat.name);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isCatActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-slate-400 dark:text-zinc-500">{getCategoryIcon(cat.iconName)}</span>
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">{cat.count || 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Security Tools Section */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
            Security Tools
          </p>
          <nav className="space-y-1">
            <button
              onClick={() => setGeneratorModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200 transition-all"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Password Generator</span>
            </button>

            <button
              onClick={() => setCheckerModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200 transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Strength Checker</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'activity'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <History className="w-4 h-4 text-cyan-500" />
              <span>Activity Timeline</span>
            </button>

            <button
              onClick={() => setActiveTab('trash')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'trash'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                <span>Trash Bin</span>
              </div>
              {trashCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-md font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {trashCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
              <span>Vault Settings</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Security Engine Card at Bottom */}
      <div className="mt-6 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200">AES-256 Vault Encrypted</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
          Zero-knowledge client-side encryption active. Master key derived via Argon2/PBKDF2.
        </p>
      </div>
    </aside>
  );
};
