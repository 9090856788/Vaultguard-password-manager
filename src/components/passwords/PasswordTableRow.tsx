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
  Edit2,
  Trash2,
  History,
} from 'lucide-react';

interface PasswordTableRowProps {
  item: PasswordItem;
}

export const PasswordTableRow: React.FC<PasswordTableRowProps> = ({ item }) => {
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

  return (
    <tr className="border-b border-zinc-800/80 hover:bg-zinc-800/40 transition-colors text-xs text-zinc-300">
      {/* Title & Logo */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {!item.isDeleted && (
            <button
              onClick={() => toggleFavorite(item)}
              className={`text-zinc-600 hover:text-amber-400 ${
                item.isFavorite ? 'text-amber-400' : ''
              }`}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
          )}
          {item.websiteLogo ? (
            <img src={item.websiteLogo} alt={item.title} className="w-7 h-7 rounded-lg object-contain p-0.5 bg-zinc-800" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20">
              {item.title.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p
              onClick={() => openDetailModal(item)}
              className="font-semibold text-white hover:text-indigo-400 cursor-pointer"
            >
              {item.title}
            </p>
            {item.websiteUrl && (
              <a
                href={item.websiteUrl.startsWith('http') ? item.websiteUrl : `https://${item.websiteUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-zinc-500 hover:underline truncate inline-block max-w-[150px]"
              >
                {item.websiteUrl}
              </a>
            )}
          </div>
        </div>
      </td>

      {/* Username / Email */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <span className="truncate max-w-[140px] text-zinc-300">{item.username || item.email || '-'}</span>
          {(item.username || item.email) && (
            <button
              onClick={() => copyToClipboard(item.username || item.email, 'Username')}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              title="Copy Username"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>
      </td>

      {/* Masked Password */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-zinc-300">{showPassword ? item.password : '••••••••••••'}</span>
          <button
            onClick={() => setShowPassword((prev) => !prev)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200"
          >
            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
          <button
            onClick={() => copyToClipboard(item.password, `Password for ${item.title}`, item.id)}
            className="p-1 rounded text-zinc-400 hover:text-indigo-400"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </td>

      {/* Category */}
      <td className="py-3 px-4">
        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
          {item.category}
        </span>
      </td>

      {/* Strength */}
      <td className="py-3 px-4">{getStrengthBadge(item.strengthLevel)}</td>

      {/* Updated */}
      <td className="py-3 px-4 text-[11px] text-zinc-500">
        {new Date(item.updatedAt).toLocaleDateString()}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        <div className="relative inline-block text-left">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl p-1.5 z-20 text-xs text-left"
              onClick={() => setMenuOpen(false)}
            >
              <button
                onClick={() => openDetailModal(item)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <span>Details</span>
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
                    <span>Restore</span>
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
      </td>
    </tr>
  );
};
