import React, { useState } from 'react';
import { PasswordItem } from '../../types';
import { useVault } from '../../context/VaultContext';
import {
  Star,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Trash2,
  History,
  Globe,
} from 'lucide-react';

interface PasswordCardProps {
  item: PasswordItem;
}

export const PasswordCard: React.FC<PasswordCardProps> = ({ item }) => {
  const {
    toggleFavorite,
    copyToClipboard,
    openEditPasswordModal,
    openDetailModal,
    deletePassword,
    restorePassword,
    permanentDeletePassword,
  } = useVault();

  const [showPassword, setShowPassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const getStrengthBadge = (level: string) => {
    switch (level) {
      case 'Very Strong':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Very Strong</span>;
      case 'Strong':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">Strong</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">Weak</span>;
    }
  };

  const getColorLabelBorder = (color: string) => {
    switch (color) {
      case 'purple': return 'border-t-4 border-t-purple-500';
      case 'emerald': return 'border-t-4 border-t-emerald-500';
      case 'amber': return 'border-t-4 border-t-amber-500';
      case 'rose': return 'border-t-4 border-t-rose-500';
      case 'indigo': return 'border-t-4 border-t-indigo-500';
      case 'cyan': return 'border-t-4 border-t-cyan-500';
      case 'slate': return 'border-t-4 border-t-slate-500';
      default: return 'border-t-4 border-t-blue-500';
    }
  };

  return (
    <div
      className={`group relative rounded-2xl glass vault-item shadow-sm hover:shadow-xl transition-all p-4 flex flex-col justify-between ${getColorLabelBorder(
        item.colorLabel
      )}`}
    >
      {/* Top Bar */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {item.websiteLogo ? (
              <img
                src={item.websiteLogo}
                alt={item.title}
                className="w-9 h-9 rounded-xl object-contain p-1 bg-zinc-800 ring-1 ring-zinc-700/60"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-base ring-1 ring-indigo-500/30">
                {item.title.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h3
                onClick={() => openDetailModal(item)}
                className="font-semibold text-sm text-white truncate hover:text-indigo-400 cursor-pointer"
              >
                {item.title}
              </h3>
              <p className="text-xs text-zinc-400 truncate">
                {item.username || item.email || 'No username'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!item.isDeleted && (
              <button
                onClick={() => toggleFavorite(item)}
                className={`p-1.5 rounded-lg transition-colors ${
                  item.isFavorite
                    ? 'text-amber-400 hover:bg-amber-400/10'
                    : 'text-zinc-600 hover:text-amber-400 hover:bg-zinc-800'
                }`}
                title={item.isFavorite ? 'Remove Favorite' : 'Add Favorite'}
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
            )}

            {/* Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl p-1.5 z-20 text-xs"
                  onClick={() => setMenuOpen(false)}
                >
                  <button
                    onClick={() => openDetailModal(item)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800"
                  >
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    <span>View Details</span>
                  </button>

                  {!item.isDeleted ? (
                    <>
                      <button
                        onClick={() => openEditPasswordModal(item)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Edit Item</span>
                      </button>

                      <div className="my-1 border-t border-zinc-800" />

                      <button
                        onClick={() => deletePassword(item.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Move to Trash</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => restorePassword(item.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/40"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Restore Item</span>
                      </button>

                      <button
                        onClick={() => permanentDeletePassword(item.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Masked Password Field */}
        <div className="my-3 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-zinc-300 tracking-wider truncate">
            {showPassword ? item.password : '••••••••••••••••'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowPassword((prev) => !prev)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
              title={showPassword ? 'Hide Password' : 'Reveal Password'}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => copyToClipboard(item.password, `Password for ${item.title}`, item.id)}
              className="p-1 rounded text-zinc-400 hover:text-indigo-400 transition-colors"
              title="Copy Password"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-2 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
            {item.category}
          </span>
          {getStrengthBadge(item.strengthLevel)}
        </div>

        {item.websiteUrl && (
          <a
            href={item.websiteUrl.startsWith('http') ? item.websiteUrl : `https://${item.websiteUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-indigo-400 p-1 rounded transition-colors"
            title="Open Website"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
