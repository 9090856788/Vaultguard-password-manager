import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { PasswordItem } from '../../types';
import { Search, X, KeyRound, Copy, ExternalLink, ArrowRight } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const {
    searchModalOpen,
    setSearchModalOpen,
    passwords,
    copyToClipboard,
    openDetailModal,
  } = useVault();

  const [query, setQuery] = useState('');

  if (!searchModalOpen) return null;

  const filtered = passwords
    .filter((p) => !p.isDeleted)
    .filter((p) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.websiteUrl.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-all text-xs">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search vault passwords, usernames, tags, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={() => setSearchModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-96 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No matching credentials found for "{query}".
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                onClick={() => {
                  setSearchModalOpen(false);
                  openDetailModal(item);
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.websiteLogo ? (
                    <img src={item.websiteLogo} alt={item.title} className="w-8 h-8 rounded-xl object-contain p-1 bg-slate-100 dark:bg-slate-800" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 font-bold text-xs flex items-center justify-center">
                      {item.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.username || item.email || item.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {item.category}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(item.password, `Password for ${item.title}`, item.id);
                    }}
                    className="p-1.5 rounded-lg bg-indigo-600 text-white font-semibold flex items-center gap-1 hover:bg-indigo-500"
                    title="Copy Password"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Esc to close</span>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
};
