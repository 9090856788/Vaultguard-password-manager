import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import {
  ShieldCheck,
  Lock,
  Zap,
  ShieldAlert,
  History,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Sliders,
  Copy,
  Check,
  Download,
  Users,
  Database,
  Eye,
  RefreshCw,
  ChevronDown,
  Star,
  Layers,
  HelpCircle
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { openAuthModal, login, showToast } = useVault();

  // Interactive Live Generator State for Hero Widget
  const [genLength, setGenLength] = useState<number>(18);
  const [useUpper, setUseUpper] = useState<boolean>(true);
  const [useNumbers, setUseNumbers] = useState<boolean>(true);
  const [useSymbols, setUseSymbols] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'vault' | 'generator' | 'audit' | 'activity'>('vault');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Generate a live password for the interactive hero widget
  const generateLivePassword = () => {
    let charset = 'abcdefghijklmnopqrstuvwxyz';
    if (useUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useNumbers) charset += '0123456789';
    if (useSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let result = '';
    const array = new Uint32Array(genLength);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < genLength; i++) {
      result += charset[array[i] % charset.length];
    }
    return result;
  };

  const [livePassword, setLivePassword] = useState<string>(() => generateLivePassword());

  const handleRegenerate = () => {
    setLivePassword(generateLivePassword());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(livePassword);
    setCopied(true);
    showToast('Generated password copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate entropy
  const calculateEntropy = () => {
    let poolSize = 26;
    if (useUpper) poolSize += 26;
    if (useNumbers) poolSize += 10;
    if (useSymbols) poolSize += 32;
    const bits = Math.round(genLength * Math.log2(poolSize));
    return bits;
  };

  const entropyBits = calculateEntropy();

  const faqs = [
    {
      q: 'How does Zero-Knowledge Encryption protect my data?',
      a: 'Zero-knowledge architecture ensures that your master password is used client-side to derive an AES-256-GCM encryption key via Argon2id. Your plaintext data is encrypted before leaving your browser. Not even ShieldVault engineers or cloud servers can read your credentials.',
    },
    {
      q: 'Can ShieldVault recover my master password if I forget it?',
      a: 'Because we operate on a strict zero-knowledge model, we never store or know your master password. However, you can export encrypted local JSON backups or set up emergency recovery seeds upon registration.',
    },
    {
      q: 'Can I import my existing passwords from Chrome or 1Password?',
      a: 'Yes! ShieldVault features a 1-click CSV importer compatible with Chrome, Safari, Bitwarden, 1Password, LastPass, and Dashlane.',
    },
    {
      q: 'Is there a free plan available?',
      a: 'Yes! The Free Starter plan includes full zero-knowledge encryption, unlimited password generation, security strength auditing, and up to 50 credentials forever.',
    },
  ];

  return (
    <div className="min-h-screen text-slate-800 dark:text-zinc-300 transition-colors">
      {/* ---------------- HERO SECTION ---------------- */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Glow background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/15 dark:bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[250px] bg-blue-500/10 dark:bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Zero-Knowledge Enterprise Vault Security</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Unbreakable Security for Your <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Digital Identity & Passwords
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Client-side AES-256-GCM encryption powered by Argon2id key derivation. Protect your credentials, API keys, and sensitive logins with zero server exposure.
          </p>

          {/* Primary CTA Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => openAuthModal('register')}
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => openAuthModal('login')}
              className="px-6 py-3.5 rounded-2xl border border-slate-300 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold text-sm shadow-sm transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              <Lock className="w-4 h-4 text-indigo-500" />
              <span>Sign In to Vault</span>
            </button>

            <button
              onClick={() => {
                login('alex.rivera@vaultguard.io', 'MasterPassword123!');
              }}
              className="px-5 py-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Try Live Demo</span>
            </button>
          </div>

          {/* Micro trust stats */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-zinc-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>AES-256-GCM Certified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Argon2id Memory Hardened</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No Credit Card Required</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Live Generator Card */}
        <div className="mt-14 max-w-3xl mx-auto rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Interactive Password Generator</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Test high-entropy password creation instantly</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {entropyBits} Entropy Bits
            </span>
          </div>

          {/* Live Generated Password Display */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-widest break-all">
              {livePassword}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRegenerate}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-all"
                title="Regenerate"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Controls */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Length Slider */}
            <div className="space-y-1.5 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/60 bg-slate-50/50 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Length</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{genLength} chars</span>
              </div>
              <input
                type="range"
                min={8}
                max={64}
                value={genLength}
                onChange={(e) => {
                  setGenLength(Number(e.target.value));
                  setLivePassword(generateLivePassword());
                }}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Character Option Toggles */}
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:border-indigo-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={useUpper}
                  onChange={(e) => {
                    setUseUpper(e.target.checked);
                    setLivePassword(generateLivePassword());
                  }}
                  className="rounded text-indigo-600 accent-indigo-600"
                />
                <span className="font-semibold">A-Z</span>
              </label>

              <label className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:border-indigo-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={useNumbers}
                  onChange={(e) => {
                    setUseNumbers(e.target.checked);
                    setLivePassword(generateLivePassword());
                  }}
                  className="rounded text-indigo-600 accent-indigo-600"
                />
                <span className="font-semibold">0-9</span>
              </label>

              <label className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:border-indigo-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={useSymbols}
                  onChange={(e) => {
                    setUseSymbols(e.target.checked);
                    setLivePassword(generateLivePassword());
                  }}
                  className="rounded text-indigo-600 accent-indigo-600"
                />
                <span className="font-semibold">!@#</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FEATURE HIGHLIGHTS GRID ---------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/80 dark:border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Built for Modern Security & Peace of Mind
          </h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Everything you need to store, manage, and audit your digital keys in one unified dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Zero-Knowledge Architecture</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Your master key is derived locally via Argon2id / PBKDF2. No unencrypted text ever touches our servers or cloud infrastructure.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">High-Entropy Generator</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Custom cryptographic random number generation up to 64 characters with configurable symbols, numbers, and entropy calculation.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Breach & Reuse Audits</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Identify weak, duplicate, or outdated credentials across your accounts before bad actors exploit them.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
              <History className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Password Version History</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Never get locked out when changing passwords. Review historical rotations and revert back whenever necessary.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Seamless CSV Import/Export</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Migrate seamlessly from Chrome, Bitwarden, or 1Password in seconds, or export your vault into an encrypted format.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm hover:shadow-lg transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Custom Categories & Tags</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Organize items by Work, Development, Financial, or custom tags with instantCmd+K master search bar access.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- INTERACTIVE APP PREVIEWS ---------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/80 dark:border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Explore the ShieldVault Experience
          </h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Click through the interactive tabs below to preview the core modules.
          </p>
        </div>

        {/* Tab Selection Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setActivePreviewTab('vault')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activePreviewTab === 'vault'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Vault Credentials
          </button>
          <button
            onClick={() => setActivePreviewTab('generator')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activePreviewTab === 'generator'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Password Generator
          </button>
          <button
            onClick={() => setActivePreviewTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activePreviewTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Security Audit
          </button>
          <button
            onClick={() => setActivePreviewTab('activity')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activePreviewTab === 'activity'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Activity Audit Log
          </button>
        </div>

        {/* Mock Preview Content */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-2xl p-6 sm:p-8">
          {activePreviewTab === 'vault' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Sample Vault Items</span>
                <span className="text-xs text-indigo-500 font-semibold">AES-256 Encrypted</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">GitHub Enterprise</p>
                    <p className="text-slate-400 text-[11px]">alex.rivera@vaultguard.io</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-semibold">Very Strong</span>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">AWS Production Console</p>
                    <p className="text-slate-400 text-[11px]">admin_dev_ops</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 font-semibold">Rotated 2d ago</span>
                </div>
              </div>
            </div>
          )}

          {activePreviewTab === 'generator' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Cryptographic Entropy Control</span>
                <span className="text-xs text-amber-500 font-semibold">96.4 Entropy Bits</span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                Generates cryptographically random credentials tailored to your site guidelines with customizable length, symbols, and character sets.
              </p>
            </div>
          )}

          {activePreviewTab === 'audit' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Health Score Engine</span>
                <span className="text-xs text-emerald-500 font-semibold">Vault Health: 92%</span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                Automated scanning flags weak, reused, or compromised passwords instantly so you can rotate them before threats occur.
              </p>
            </div>
          )}

          {activePreviewTab === 'activity' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Real-Time Security Timeline</span>
                <span className="text-xs text-cyan-500 font-semibold">100% Immutable</span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                Logs every password view, copy event, credential update, or login attempt with IP tracking and timestamps.
              </p>
            </div>
          )}
        </div>
      </section>



      {/* ---------------- FREQUENTLY ASKED QUESTIONS ---------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-200/80 dark:border-zinc-800/80">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Have questions about security, zero-knowledge architecture, or migration?
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between gap-4"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 pt-1 sm:px-5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed border-t border-slate-100 dark:border-zinc-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- BOTTOM CALL TO ACTION ---------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 sm:p-12 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Take Control of Your Digital Security Today
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Create your zero-knowledge master vault in seconds. Free forever, no credit card needed.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuthModal('register')}
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <span>Create Free Master Vault</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => openAuthModal('login')}
              className="px-6 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Log In</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-500 dark:text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>ShieldVault Pro SaaS</span>
          </div>
          <p>© {new Date().getFullYear()} ShieldVault Zero-Knowledge Systems. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-500 dark:text-zinc-400">
            <button onClick={() => openAuthModal('login')} className="hover:underline">Sign In</button>
            <button onClick={() => openAuthModal('register')} className="hover:underline">Register Account</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
