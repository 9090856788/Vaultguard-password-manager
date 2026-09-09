import React, { useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { PasswordItem, ColorLabel } from '../../types';
import { analyzePasswordStrength, generateSecurePassword } from '../../utils/crypto';
import {
  X,
  Lock,
  Globe,
  User,
  Mail,
  KeyRound,
  FolderKanban,
  FileText,
  Tag,
  Star,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export const PasswordFormModal: React.FC = () => {
  const {
    formModalOpen,
    editingPassword,
    closeFormModal,
    savePassword,
    categories,
  } = useVault();

  const [title, setTitle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('Personal');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [colorLabel, setColorLabel] = useState<ColorLabel>('blue');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate initial password for new records
  useEffect(() => {
    if (editingPassword) {
      setTitle(editingPassword.title || '');
      setWebsiteUrl(editingPassword.websiteUrl || '');
      setUsername(editingPassword.username || '');
      setEmail(editingPassword.email || '');
      setPassword(editingPassword.password || '');
      setCategory(editingPassword.category || 'Personal');
      setNotes(editingPassword.notes || '');
      setTagsInput((editingPassword.tags || []).join(', '));
      setColorLabel(editingPassword.colorLabel || 'blue');
      setIsFavorite(editingPassword.isFavorite || false);
    } else {
      setTitle('');
      setWebsiteUrl('');
      setUsername('');
      setEmail('');
      setPassword(
        generateSecurePassword({
          length: 16,
          includeUppercase: true,
          includeLowercase: true,
          includeNumbers: true,
          includeSymbols: true,
          excludeSimilar: false,
          excludeAmbiguous: false,
        })
      );
      setCategory('Personal');
      setNotes('');
      setTagsInput('');
      setColorLabel('blue');
      setIsFavorite(false);
    }
  }, [editingPassword, formModalOpen]);

  if (!formModalOpen) return null;

  const strength = analyzePasswordStrength(password);

  const handleGenerateClick = () => {
    const newPwd = generateSecurePassword({
      length: 18,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeSimilar: false,
      excludeAmbiguous: false,
    });
    setPassword(newPwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !password) return;

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await savePassword({
        title: title.trim(),
        websiteUrl: websiteUrl.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        category,
        notes: notes.trim(),
        tags,
        colorLabel,
        isFavorite,
        strengthScore: strength.score,
        strengthLevel: strength.level,
        entropyBits: strength.entropyBits,
        estimatedCrackTime: strength.crackTime,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors: ColorLabel[] = ['blue', 'purple', 'emerald', 'amber', 'rose', 'indigo', 'cyan', 'slate'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 transition-all text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                {editingPassword ? 'Edit Credential' : 'Add New Credential'}
              </h2>
              <p className="text-slate-400">Store encrypted password details in vault</p>
            </div>
          </div>

          <button
            onClick={closeFormModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Favorite */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Title / Service Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. GitHub Enterprise"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name} className="dark:bg-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Website URL */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Website URL</label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="https://github.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Username & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="alex_dev"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  placeholder="alex@vaultguard.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Password Input & Generator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Password *</label>
              <button
                type="button"
                onClick={handleGenerateClick}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Regenerate High Entropy</span>
              </button>
            </div>

            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-20 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <div className="absolute right-2 top-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateClick}
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  title="Generate Random Password"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Realtime Strength Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Strength: <strong className="text-slate-700 dark:text-slate-200">{strength.level}</strong> ({strength.score}%)</span>
                <span className="text-slate-400">Crack time: {strength.crackTime}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    strength.score >= 80
                      ? 'bg-emerald-500'
                      : strength.score >= 60
                      ? 'bg-blue-500'
                      : strength.score >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(5, strength.score)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Color Label & Favorite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Color Label</label>
              <div className="flex items-center gap-2 pt-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorLabel(c)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      c === 'purple' ? 'bg-purple-500' :
                      c === 'emerald' ? 'bg-emerald-500' :
                      c === 'amber' ? 'bg-amber-500' :
                      c === 'rose' ? 'bg-rose-500' :
                      c === 'indigo' ? 'bg-indigo-500' :
                      c === 'cyan' ? 'bg-cyan-500' :
                      c === 'slate' ? 'bg-slate-500' : 'bg-blue-500'
                    } ${colorLabel === c ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-70 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-950"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span>Star as Favorite</span>
                </span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Tags (comma separated)</label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Production, API Keys, Critical"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Secure Notes</label>
            <textarea
              rows={2}
              placeholder="Recovery codes, security question answers, API keys..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Submit CTA */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeFormModal}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Encrypting & Saving...' : editingPassword ? 'Update Credential' : 'Save Credential'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
