import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import {
  X,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  History,
  Clock,
  ShieldCheck,
  Edit2,
  Trash2,
  Tag,
  FileText,
  Star,
} from 'lucide-react';

export const PasswordDetailModal: React.FC = () => {
  const {
    detailModalOpen,
    viewingPassword,
    closeDetailModal,
    copyToClipboard,
    openEditPasswordModal,
    deletePassword,
    toggleFavorite,
  } = useVault();

  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  if (!detailModalOpen || !viewingPassword) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 transition-all text-xs">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {viewingPassword.websiteLogo ? (
              <img
                src={viewingPassword.websiteLogo}
                alt={viewingPassword.title}
                className="w-11 h-11 rounded-2xl object-contain p-1.5 bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700/60 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-500 font-bold text-lg flex items-center justify-center shrink-0">
                {viewingPassword.title.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {viewingPassword.title}
              </h2>
              {viewingPassword.websiteUrl && (
                <a
                  href={viewingPassword.websiteUrl.startsWith('http') ? viewingPassword.websiteUrl : `https://${viewingPassword.websiteUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5 truncate"
                >
                  <span className="truncate">{viewingPassword.websiteUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggleFavorite(viewingPassword)}
              className={`p-2 rounded-xl transition-colors ${
                viewingPassword.isFavorite
                  ? 'text-amber-400 bg-amber-400/10'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={closeDetailModal}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher: Overview vs Version History */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === 'details'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Credential Details
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Version History ({viewingPassword.versionHistory?.length || 0})</span>
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="space-y-4">
            {/* Username / Email row */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Username / Email</p>
                <p className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5">
                  {viewingPassword.username || viewingPassword.email || 'None specified'}
                </p>
              </div>
              {(viewingPassword.username || viewingPassword.email) && (
                <button
                  onClick={() =>
                    copyToClipboard(
                      viewingPassword.username || viewingPassword.email,
                      'Username'
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              )}
            </div>

            {/* Password Row */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Password</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5 tracking-wider truncate">
                  {showPassword ? viewingPassword.password : '••••••••••••••••'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowPassword((p) => !p)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() =>
                    copyToClipboard(viewingPassword.password, `Password for ${viewingPassword.title}`, viewingPassword.id)
                  }
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Password</span>
                </button>
              </div>
            </div>

            {/* Strength Analysis Pill */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Security Analytics</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingPassword.strengthScore}% ({viewingPassword.strengthLevel})</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                <div>Entropy: <strong className="text-slate-700 dark:text-slate-200">{viewingPassword.entropyBits} bits</strong></div>
                <div>Est. Crack Time: <strong className="text-slate-700 dark:text-slate-200">{viewingPassword.estimatedCrackTime}</strong></div>
              </div>
            </div>

            {/* Tags & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Category</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{viewingPassword.category}</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Version</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">v{viewingPassword.versionNumber || 1}</p>
              </div>
            </div>

            {/* Notes */}
            {viewingPassword.notes && (
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Secure Notes</span>
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {viewingPassword.notes}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  closeDetailModal();
                  deletePassword(viewingPassword.id);
                }}
                className="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>

              <button
                onClick={() => {
                  closeDetailModal();
                  openEditPasswordModal(viewingPassword);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Credential</span>
              </button>
            </div>
          </div>
        ) : (
          /* Version History Tab */
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {(!viewingPassword.versionHistory || viewingPassword.versionHistory.length === 0) ? (
              <div className="p-8 text-center text-slate-400">
                No previous password versions recorded yet.
              </div>
            ) : (
              viewingPassword.versionHistory.map((ver) => (
                <div key={ver.id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Version {ver.versionNumber}</span>
                    <span className="text-[10px] text-slate-400">{new Date(ver.updatedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span>{ver.password}</span>
                    <button
                      onClick={() => copyToClipboard(ver.password, `Version ${ver.versionNumber} password`)}
                      className="p-1 text-slate-400 hover:text-indigo-600"
                      title="Copy Version Password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
