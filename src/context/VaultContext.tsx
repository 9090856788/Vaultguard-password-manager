import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { PasswordItem, CategoryItem, SecurityStats, ActivityLog, UserProfile, FilterOptions } from '../types';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface VaultContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTab: string;
  selectedCategory: string;
  passwords: PasswordItem[];
  categories: CategoryItem[];
  securityStats: SecurityStats | null;
  activityLogs: ActivityLog[];
  filterOptions: FilterOptions;
  theme: 'dark' | 'light';
  toast: Toast | null;
  
  // Modals & Drawers
  searchModalOpen: boolean;
  formModalOpen: boolean;
  editingPassword: PasswordItem | null;
  detailModalOpen: boolean;
  viewingPassword: PasswordItem | null;
  generatorModalOpen: boolean;
  checkerModalOpen: boolean;
  importModalOpen: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot';

  // Action methods
  setActiveTab: (tab: string) => void;
  setSelectedCategory: (cat: string) => void;
  setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptions>>;
  setTheme: (theme: 'dark' | 'light') => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  
  openCreatePasswordModal: () => void;
  openEditPasswordModal: (item: PasswordItem) => void;
  closeFormModal: () => void;
  
  openDetailModal: (item: PasswordItem) => void;
  closeDetailModal: () => void;
  
  setSearchModalOpen: (open: boolean) => void;
  setGeneratorModalOpen: (open: boolean) => void;
  setCheckerModalOpen: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
  
  openAuthModal: (mode?: 'login' | 'register' | 'forgot') => void;
  closeAuthModal: () => void;

  // Data Actions
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, name: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshVault: () => Promise<void>;
  
  savePassword: (data: Partial<PasswordItem>) => Promise<void>;
  deletePassword: (id: string) => Promise<void>;
  restorePassword: (id: string) => Promise<void>;
  permanentDeletePassword: (id: string) => Promise<void>;
  toggleFavorite: (item: PasswordItem) => Promise<void>;
  copyToClipboard: (text: string, label: string, passwordId?: string) => void;
  createCategory: (name: string, icon?: string, color?: string) => Promise<void>;
  importVaultCsv: (csvData: string) => Promise<number>;
  exportVaultCsv: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  changeMasterPassword: (current: string, newPass: string) => Promise<void>;
}

const defaultFilterOptions: FilterOptions = {
  searchQuery: '',
  category: 'All',
  tag: 'All',
  isFavorite: false,
  strength: 'All',
  status: 'active',
  sortBy: 'newest',
  viewMode: 'grid',
};

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('vaultguard_user');
    return cached ? JSON.parse(cached) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('vaultguard_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(defaultFilterOptions);

  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('vaultguard_theme') as 'dark' | 'light') || 'dark';
  });

  const [toast, setToast] = useState<Toast | null>(null);

  // Modals
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [editingPassword, setEditingPassword] = useState<PasswordItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [viewingPassword, setViewingPassword] = useState<PasswordItem | null>(null);
  const [generatorModalOpen, setGeneratorModalOpen] = useState<boolean>(false);
  const [checkerModalOpen, setCheckerModalOpen] = useState<boolean>(false);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3500);
  }, []);

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('vaultguard_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const refreshVault = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [pwdRes, catRes, statsRes, actRes] = await Promise.all([
        api.getPasswords({
          status: activeTab === 'trash' ? 'trash' : 'active',
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: filterOptions.searchQuery,
          tag: filterOptions.tag,
          favorite: activeTab === 'favorites' ? true : undefined,
          strength: filterOptions.strength,
          sortBy: filterOptions.sortBy,
        }),
        api.getCategories(),
        api.getSecurityStats(),
        api.getActivityTimeline(),
      ]);

      setPasswords(Array.isArray(pwdRes?.items) ? pwdRes.items : []);
      setCategories(Array.isArray(catRes?.items) ? catRes.items : []);
      setSecurityStats(statsRes || null);
      setActivityLogs(Array.isArray(actRes?.items) ? actRes.items : []);
    } catch (err: any) {
      console.error('Vault refresh error:', err);
      showToast(err.message || 'Failed to sync vault data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, activeTab, selectedCategory, filterOptions, showToast]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshVault();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshVault]);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K search, Esc close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Unauthorized Event
  useEffect(() => {
    const handleUnauth = () => {
      setIsAuthenticated(false);
      setUser(null);
      setAuthModalMode('login');
      setAuthModalOpen(true);
      showToast('Session expired. Please log in again.', 'info');
    };
    window.addEventListener('vaultguard_unauthorized', handleUnauth);
    return () => window.removeEventListener('vaultguard_unauthorized', handleUnauth);
  }, [showToast]);

  // Inactivity Auto-Logout Timer
  useEffect(() => {
    if (!isAuthenticated) return;

    const autoLogoutMs = (user?.autoLogoutMinutes || 15) * 60 * 1000;
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem('vaultguard_token');
        localStorage.removeItem('vaultguard_refresh_token');
        localStorage.removeItem('vaultguard_user');
        setUser(null);
        setIsAuthenticated(false);
        setPasswords([]);
        setCategories([]);
        setSecurityStats(null);
        setAuthModalMode('login');
        setAuthModalOpen(true);
        showToast('Vault auto-locked due to inactivity for security', 'info');
      }, autoLogoutMs);
    };

    resetTimer();

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer));

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuthenticated, user?.autoLogoutMinutes, showToast]);

  // Auth Methods
  const login = async (email: string, pass: string) => {
    const data = await api.login(email, pass);
    setUser(data.user);
    setIsAuthenticated(true);
    setAuthModalOpen(false);
    showToast(`Welcome back, ${data.user.fullName}!`, 'success');
  };

  const register = async (email: string, name: string, pass: string) => {
    const data = await api.register(email, name, pass);
    setUser(data.user);
    setIsAuthenticated(true);
    setAuthModalOpen(false);
    showToast(`Welcome to VaultGuard, ${data.user.fullName}!`, 'success');
  };

  const logout = () => {
    localStorage.removeItem('vaultguard_token');
    localStorage.removeItem('vaultguard_refresh_token');
    localStorage.removeItem('vaultguard_user');
    setUser(null);
    setIsAuthenticated(false);
    setPasswords([]);
    setCategories([]);
    setSecurityStats(null);
    showToast('Logged out of vault securely', 'info');
  };

  // Modals helpers
  const openCreatePasswordModal = () => {
    setEditingPassword(null);
    setFormModalOpen(true);
  };

  const openEditPasswordModal = (item: PasswordItem) => {
    setEditingPassword(item);
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setEditingPassword(null);
  };

  const openDetailModal = (item: PasswordItem) => {
    setViewingPassword(item);
    setDetailModalOpen(true);
    api.logViewPassword(item.id).catch(console.error);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setViewingPassword(null);
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Password Actions
  const savePassword = async (data: Partial<PasswordItem>) => {
    if (editingPassword) {
      await api.updatePassword(editingPassword.id, data);
      showToast('Password record updated successfully', 'success');
    } else {
      await api.createPassword(data);
      showToast('New password added to vault', 'success');
    }
    closeFormModal();
    await refreshVault();
  };

  const deletePassword = async (id: string) => {
    await api.deletePassword(id);
    showToast('Item moved to Trash', 'info');
    if (viewingPassword?.id === id) closeDetailModal();
    await refreshVault();
  };

  const restorePassword = async (id: string) => {
    await api.restorePassword(id);
    showToast('Item restored from Trash', 'success');
    await refreshVault();
  };

  const permanentDeletePassword = async (id: string) => {
    await api.permanentDeletePassword(id);
    showToast('Item permanently deleted from vault', 'info');
    await refreshVault();
  };

  const toggleFavorite = async (item: PasswordItem) => {
    await api.updatePassword(item.id, { isFavorite: !item.isFavorite });
    showToast(item.isFavorite ? 'Removed from Favorites' : 'Starred to Favorites', 'success');
    await refreshVault();
  };

  const copyToClipboard = (text: string, label: string, passwordId?: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`, 'success');

    if (passwordId && label.toLowerCase().includes('password')) {
      api.logCopyPassword(passwordId).catch(console.error);
    }

    // Auto wipe clipboard timer based on user preference
    const seconds = user?.clipboardClearSeconds || 30;
    setTimeout(() => {
      navigator.clipboard.readText().then((currentClip) => {
        if (currentClip === text) {
          navigator.clipboard.writeText('');
          showToast('Clipboard automatically cleared for security', 'info');
        }
      }).catch(() => {});
    }, seconds * 1000);
  };

  const createCategory = async (name: string, icon = 'Folder', color = 'bg-blue-500') => {
    await api.createCategory(name, icon, color);
    showToast(`Category "${name}" created`, 'success');
    await refreshVault();
  };

  const importVaultCsv = async (csvData: string) => {
    const res = await api.importVault(csvData);
    showToast(res.message, 'success');
    await refreshVault();
    return res.importedCount;
  };

  const exportVaultCsv = async () => {
    const blob = await api.exportVault();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VaultGuard_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showToast('Vault exported to CSV securely', 'success');
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
    showToast('Profile and security preferences updated', 'success');
  };

  const changeMasterPassword = async (current: string, newPass: string) => {
    await api.changePassword(current, newPass);
    showToast('Master password changed successfully!', 'success');
  };

  return (
    <VaultContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        activeTab,
        selectedCategory,
        passwords,
        categories,
        securityStats,
        activityLogs,
        filterOptions,
        theme,
        toast,
        
        searchModalOpen,
        formModalOpen,
        editingPassword,
        detailModalOpen,
        viewingPassword,
        generatorModalOpen,
        checkerModalOpen,
        importModalOpen,
        authModalOpen,
        authModalMode,

        setActiveTab,
        setSelectedCategory,
        setFilterOptions,
        setTheme,
        showToast,
        
        openCreatePasswordModal,
        openEditPasswordModal,
        closeFormModal,
        openDetailModal,
        closeDetailModal,
        
        setSearchModalOpen,
        setGeneratorModalOpen,
        setCheckerModalOpen,
        setImportModalOpen,
        openAuthModal,
        closeAuthModal,

        login,
        register,
        logout,
        refreshVault,
        
        savePassword,
        deletePassword,
        restorePassword,
        permanentDeletePassword,
        toggleFavorite,
        copyToClipboard,
        createCategory,
        importVaultCsv,
        exportVaultCsv,
        updateUserProfile,
        changeMasterPassword,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
