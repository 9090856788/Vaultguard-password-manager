import React, { useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { PasswordGeneratorOptions } from '../../types';
import { generateSecurePassword, analyzePasswordStrength } from '../../utils/crypto';
import {
  X,
  Zap,
  Copy,
  RefreshCw,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';

export const PasswordGeneratorModal: React.FC = () => {
  const { generatorModalOpen, setGeneratorModalOpen, copyToClipboard } = useVault();

  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 20,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false,
  });

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (generatorModalOpen) {
      regenerate();
    }
  }, [generatorModalOpen, options]);

  if (!generatorModalOpen) return null;

  const regenerate = () => {
    const pwd = generateSecurePassword(options);
    setGeneratedPassword(pwd);
    setCopied(false);
  };

  const handleCopy = () => {
    copyToClipboard(generatedPassword, 'Generated Password');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = analyzePasswordStrength(generatedPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md my-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 transition-all text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Password Generator
              </h2>
              <p className="text-slate-400">Cryptographically secure random password engine</p>
            </div>
          </div>

          <button
            onClick={() => setGeneratorModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Password Box */}
        <div className="space-y-3">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tracking-wider break-all select-all">
              {generatedPassword}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={regenerate}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="Regenerate"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Strength & Entropy Indicator */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Strength: {strength.level}</span>
              </span>
              <span>{strength.score}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  strength.score >= 80 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.max(5, strength.score)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
              <div>Entropy: <strong className="text-slate-700 dark:text-slate-200">{strength.entropyBits} bits</strong></div>
              <div>Est. Crack Time: <strong className="text-slate-700 dark:text-slate-200">{strength.crackTime}</strong></div>
            </div>
          </div>

          {/* Generator Controls */}
          <div className="space-y-4 pt-2">
            {/* Length Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Password Length</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 text-sm font-bold">{options.length} characters</span>
              </div>
              <input
                type="range"
                min="8"
                max="64"
                value={options.length}
                onChange={(e) => setOptions((prev) => ({ ...prev, length: Number(e.target.value) }))}
                className="w-full h-2 rounded-lg appearance-none bg-slate-200 dark:bg-slate-800 accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Character Options Toggles */}
            <div className="grid grid-cols-2 gap-3 font-medium text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeUppercase}
                  onChange={(e) => setOptions((p) => ({ ...p, includeUppercase: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Uppercase (A-Z)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeLowercase}
                  onChange={(e) => setOptions((p) => ({ ...p, includeLowercase: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Lowercase (a-z)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeNumbers}
                  onChange={(e) => setOptions((p) => ({ ...p, includeNumbers: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Numbers (0-9)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeSymbols}
                  onChange={(e) => setOptions((p) => ({ ...p, includeSymbols: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Symbols (!@#$)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={options.excludeSimilar}
                  onChange={(e) => setOptions((p) => ({ ...p, excludeSimilar: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Exclude Similar Characters (i, l, 1, L, o, 0, O)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
