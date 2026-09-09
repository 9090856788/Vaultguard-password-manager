import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import {
  Settings,
  User,
  Lock,
  Shield,
  Download,
  Upload,
  Clock,
  KeyRound,
  Trash2,
  Check,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    user,
    updateUserProfile,
    changeMasterPassword,
    exportVaultCsv,
    setImportModalOpen,
    logout,
  } = useVault();

  // Profile Form
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(user?.autoLogoutMinutes || 15);
  const [clipboardClearSeconds, setClipboardClearSeconds] = useState(user?.clipboardClearSeconds || 30);
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is2FAEnabled || false);

  // Master Password Form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile({
        fullName,
        avatarUrl,
        autoLogoutMinutes: Number(autoLogoutMinutes),
        clipboardClearSeconds: Number(clipboardClearSeconds),
        is2FAEnabled,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMasterPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match');
      return;
    }
    if (newPass.length < 8) {
      setPassError('New master password must be at least 8 characters long');
      return;
    }

    setSavingPass(true);
    try {
      await changeMasterPassword(currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to change master password');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          <span>Vault Preferences & Security Settings</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure security timeouts, master password encryption keys, profile details, and data backup.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Security Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile & Timers Form */}
          <form
            onSubmit={handleProfileSave}
            className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 text-xs"
          >
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <User className="w-4 h-4 text-indigo-500" />
              <span>User Account Profile</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Auto Logout & Clipboard Clear Timers */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Security & Inactivity Timers</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Auto-Logout Idle Timeout</label>
                  <select
                    value={autoLogoutMinutes}
                    onChange={(e) => setAutoLogoutMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value={5}>5 Minutes</option>
                    <option value={15}>15 Minutes (Recommended)</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Clipboard Auto-Clear Timer</label>
                  <select
                    value={clipboardClearSeconds}
                    onChange={(e) => setClipboardClearSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value={15}>15 Seconds</option>
                    <option value={30}>30 Seconds (Recommended)</option>
                    <option value={60}>60 Seconds</option>
                    <option value={120}>2 Minutes</option>
                  </select>
                </div>
              </div>

              {/* 2FA Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={is2FAEnabled}
                  onChange={(e) => setIs2FAEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Enable Two-Factor Authentication (2FA)</p>
                  <p className="text-[11px] text-slate-400">Require an authenticator app TOTP code on login</p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {savingProfile ? 'Saving Profile...' : 'Save Profile Preferences'}
            </button>
          </form>

          {/* Change Master Password Form */}
          <form
            onSubmit={handleMasterPasswordChange}
            className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 text-xs"
          >
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Change Master Vault Password</span>
            </h2>

            {passError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold">
                {passError}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Current Master Password</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">New Master Password</label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Confirm New Master Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPass}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
            >
              {savingPass ? 'Re-encrypting Master Key...' : 'Update Master Password'}
            </button>
          </form>
        </div>

        {/* Right Column: Backup & Import/Export */}
        <div className="space-y-6 text-xs">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Data Import & Backup</span>
            </h2>

            <p className="text-slate-500 leading-relaxed">
              Export your vault items as encrypted CSV or import existing password exports from 1Password, Bitwarden, or Chrome.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={exportVaultCsv}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold transition-all"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Export Vault (CSV)</span>
              </button>

              <button
                onClick={() => setImportModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold transition-all"
              >
                <Upload className="w-4 h-4 text-blue-500" />
                <span>Import CSV File</span>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 shadow-xs space-y-3">
            <h2 className="font-bold text-sm text-rose-500 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Danger Zone</span>
            </h2>
            <p className="text-rose-400 leading-relaxed">
              Lock your vault session immediately or wipe local storage tokens.
            </p>

            <button
              onClick={logout}
              className="w-full px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md transition-all"
            >
              Lock Vault & Clear Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
