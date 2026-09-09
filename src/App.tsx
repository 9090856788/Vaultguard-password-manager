import React from 'react';
import { VaultProvider, useVault } from './context/VaultContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { PasswordListHeader } from './components/passwords/PasswordListHeader';
import { PasswordCard } from './components/passwords/PasswordCard';
import { PasswordTableRow } from './components/passwords/PasswordTableRow';
import { PasswordFormModal } from './components/passwords/PasswordFormModal';
import { PasswordDetailModal } from './components/passwords/PasswordDetailModal';
import { PasswordGeneratorModal } from './components/passwords/PasswordGeneratorModal';
import { PasswordStrengthCheckerModal } from './components/passwords/PasswordStrengthCheckerModal';
import { ActivityTimelineView } from './components/activity/ActivityTimelineView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthModal } from './components/auth/AuthModal';
import { SearchModal } from './components/common/SearchModal';
import { ImportModal } from './components/common/ImportModal';
import { ToastContainer } from './components/common/ToastContainer';
import { LandingPage } from './components/landing/LandingPage';
import { KeyRound, Plus } from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    activeTab,
    passwords,
    filterOptions,
    isLoading,
    openCreatePasswordModal,
  } = useVault();

  const renderPasswordListView = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 animate-pulse p-4"
            />
          ))}
        </div>
      );
    }

    const list = passwords || [];

    if (list.length === 0) {
      return (
        <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-400 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            {activeTab === 'trash' ? 'Trash Bin is Empty' : 'No credentials found'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === 'trash'
              ? 'Items moved to trash will appear here for 30 days.'
              : 'Add your first password credential or adjust your search filters.'}
          </p>
          {activeTab !== 'trash' && (
            <button
              onClick={openCreatePasswordModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Password</span>
            </button>
          )}
        </div>
      );
    }

    if (filterOptions.viewMode === 'table') {
      return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Website / Service</th>
                <th className="py-3 px-4">Username / Email</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Strength</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <PasswordTableRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((item) => (
          <PasswordCard key={item.id} item={item} />
        ))}
      </div>
    );
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-colors">
      {activeTab === 'dashboard' && <DashboardOverview />}
      {activeTab === 'activity' && <ActivityTimelineView />}
      {activeTab === 'settings' && <SettingsView />}
      {(activeTab === 'all' || activeTab === 'favorites' || activeTab === 'trash') && (
        <div className="space-y-6">
          <PasswordListHeader />
          {renderPasswordListView()}
        </div>
      )}
    </main>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useVault();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-800 dark:text-zinc-300 flex flex-col font-sans transition-colors selection:bg-indigo-500/30">
        <Navbar />
        <LandingPage />
        <AuthModal />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-800 dark:text-zinc-300 flex flex-col font-sans transition-colors selection:bg-indigo-500/30">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <MainContent />
      </div>

      {/* Global Modals & Drawers */}
      <PasswordFormModal />
      <PasswordDetailModal />
      <PasswordGeneratorModal />
      <PasswordStrengthCheckerModal />
      <AuthModal />
      <SearchModal />
      <ImportModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <VaultProvider>
      <AppContent />
    </VaultProvider>
  );
}
