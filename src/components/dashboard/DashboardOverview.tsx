import React from 'react';
import { useVault } from '../../context/VaultContext';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Star,
  Zap,
  RefreshCw,
  AlertTriangle,
  Lock,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const {
    securityStats,
    passwords,
    categories,
    openCreatePasswordModal,
    setGeneratorModalOpen,
    setCheckerModalOpen,
    setActiveTab,
    openDetailModal,
  } = useVault();

  if (!securityStats) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Loading Vault Security Analytics...
      </div>
    );
  }

  const {
    overallScore = 100,
    totalPasswords = 0,
    favoriteCount = 0,
    weakCount = 0,
    duplicateCount = 0,
    oldPasswordsCount = 0,
    recentlyUpdated = [],
    recentlyAdded = [],
  } = securityStats || {};

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 60) return 'text-blue-500 stroke-blue-500';
    if (score >= 40) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 p-6 md:p-8 text-white shadow-2xl border border-zinc-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vault Security Health Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight glow-text">
              Enterprise Vault Overview
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Your credentials are encrypted locally with AES-256-GCM zero-knowledge protocol.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openCreatePasswordModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Password</span>
            </button>
            <button
              onClick={() => setGeneratorModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-xs transition-all"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Password Generator</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Security Score Card */}
        <div className="p-5 rounded-2xl stat-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">Security Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-white">{overallScore}%</span>
              <span className="text-xs text-zinc-500">/ 100</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {overallScore >= 80 ? 'Vault is secure' : 'Action recommended'}
            </p>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <ShieldCheck className={`w-10 h-10 ${getScoreColor(overallScore)}`} />
          </div>
        </div>

        {/* Total Passwords */}
        <div className="p-5 rounded-2xl stat-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">Total Credentials</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalPasswords}</h3>
            <p className="text-[11px] text-zinc-400 mt-1">Across all categories</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
        </div>

        {/* Weak Passwords */}
        <div
          onClick={() => setCheckerModalOpen(true)}
          className="p-5 rounded-2xl stat-card shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-500/50 transition-all"
        >
          <div>
            <p className="text-xs font-medium text-zinc-400">Weak Passwords</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1">{weakCount}</h3>
            <p className="text-[11px] text-rose-400 mt-1">Click to audit & fix</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Favorites */}
        <div
          onClick={() => setActiveTab('favorites')}
          className="p-5 rounded-2xl stat-card shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition-all"
        >
          <div>
            <p className="text-xs font-medium text-zinc-400">Starred Favorites</p>
            <h3 className="text-2xl font-bold text-white mt-1">{favoriteCount}</h3>
            <p className="text-[11px] text-zinc-400 mt-1">Quick access items</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Security Alerts & Recommendations */}
      {(weakCount > 0 || duplicateCount > 0 || oldPasswordsCount > 0) && (
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 text-amber-200 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="font-semibold text-sm">Security Recommendations</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {weakCount > 0 && (
              <div className="p-3 rounded-xl glass flex items-center justify-between">
                <span>{weakCount} weak passwords detected</span>
                <button
                  onClick={() => setCheckerModalOpen(true)}
                  className="font-semibold text-amber-400 hover:underline"
                >
                  Fix Now →
                </button>
              </div>
            )}
            {duplicateCount > 0 && (
              <div className="p-3 rounded-xl glass flex items-center justify-between">
                <span>{duplicateCount} reused passwords across sites</span>
                <button
                  onClick={() => setActiveTab('all')}
                  className="font-semibold text-amber-400 hover:underline"
                >
                  Review →
                </button>
              </div>
            )}
            {oldPasswordsCount > 0 && (
              <div className="p-3 rounded-xl glass flex items-center justify-between">
                <span>{oldPasswordsCount} passwords older than 90 days</span>
                <button
                  onClick={() => setGeneratorModalOpen(true)}
                  className="font-semibold text-amber-400 hover:underline"
                >
                  Rotate →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two-Column Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recently Added & Updated List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Recently Added Credentials</span>
            </h2>
            <button
              onClick={() => setActiveTab('all')}
              className="text-xs text-indigo-400 hover:underline font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(recentlyAdded || []).map((pwd) => (
              <div
                key={pwd.id}
                onClick={() => openDetailModal(pwd)}
                className="p-4 rounded-2xl glass vault-item transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {pwd.websiteLogo ? (
                    <img src={pwd.websiteLogo} alt={pwd.title} className="w-9 h-9 rounded-xl object-contain p-1 bg-zinc-800" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold text-sm flex items-center justify-center border border-indigo-500/20">
                      {pwd.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-white truncate">{pwd.title}</h4>
                    <p className="text-[11px] text-zinc-400 truncate">{pwd.username || pwd.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-2 py-0.5 text-[10px] rounded-md font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                    {pwd.category}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {new Date(pwd.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown Side Panel */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white">Categories Distribution</h2>
          <div className="p-5 rounded-2xl glass space-y-4">
            {(categories || []).map((cat) => {
              const count = cat.count || 0;
              const percentage = totalPasswords > 0 ? Math.round((count / totalPasswords) * 100) : 0;
              return (
                <div key={cat.id} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-300 font-medium">
                    <span>{cat.name}</span>
                    <span className="text-zinc-500">{count} items ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden">
                    <div
                      className={`h-full ${cat.color || 'bg-indigo-500'} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
