import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { analyzePasswordStrength } from '../../utils/crypto';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

export const PasswordStrengthCheckerModal: React.FC = () => {
  const { checkerModalOpen, setCheckerModalOpen } = useVault();
  const [testPassword, setTestPassword] = useState('');

  if (!checkerModalOpen) return null;

  const result = analyzePasswordStrength(testPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md my-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 transition-all text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Password Strength Audit
              </h2>
              <p className="text-slate-400">Evaluate entropy, complexity & crack time estimates</p>
            </div>
          </div>

          <button
            onClick={() => setCheckerModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Test Password</label>
            <input
              type="text"
              placeholder="Type password to audit..."
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>

          {/* Results Analysis */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
            <div className="flex items-center justify-between font-bold text-sm">
              <span className="text-slate-700 dark:text-slate-300">Strength Level</span>
              <span
                className={
                  result.score >= 80
                    ? 'text-emerald-500'
                    : result.score >= 60
                    ? 'text-blue-500'
                    : result.score >= 40
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }
              >
                {result.level} ({result.score}%)
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  result.score >= 80
                    ? 'bg-emerald-500'
                    : result.score >= 60
                    ? 'bg-blue-500'
                    : result.score >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(5, result.score)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-semibold">Entropy Score</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{result.entropyBits} Bits</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-semibold">Estimated Crack Time</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{result.crackTime}</p>
              </div>
            </div>
          </div>

          {/* Character composition checklist */}
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              {result.hasUppercase ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
              <span>Uppercase Letters</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              {result.hasLowercase ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
              <span>Lowercase Letters</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              {result.hasNumbers ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
              <span>Numbers (0-9)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              {result.hasSymbols ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-400" />}
              <span>Special Symbols</span>
            </div>
          </div>

          {/* Warnings & Suggestions */}
          {result.warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-1">
              {result.warnings.map((w, i) => (
                <p key={i} className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{w}</span>
                </p>
              ))}
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 space-y-1">
              <p className="font-semibold text-indigo-400 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Recommendations:</span>
              </p>
              {result.suggestions.map((s, i) => (
                <p key={i} className="text-[11px] pl-4 list-disc">• {s}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
