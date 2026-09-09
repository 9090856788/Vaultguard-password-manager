/**
 * VaultGuard REST API Client
 */

import { AuthResponse, CategoryItem, PasswordItem, SecurityStats, ActivityLog, UserProfile } from '../types';

const API_BASE = '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('vaultguard_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('vaultguard_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const refreshToken = localStorage.getItem('vaultguard_refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.token) {
            localStorage.setItem('vaultguard_token', refreshData.token);
            const retriedHeaders = {
              ...(options.headers || {}),
              Authorization: `Bearer ${refreshData.token}`,
            };
            response = await fetch(url, { ...options, headers: retriedHeaders });
          }
        }
      } catch (err) {
        console.error('Token refresh attempt failed:', err);
      }
    }
  }

  return response;
}

async function handleResponse<T>(response: Response, isAuthRequest = false): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !isAuthRequest) {
      localStorage.removeItem('vaultguard_token');
      localStorage.removeItem('vaultguard_refresh_token');
      localStorage.removeItem('vaultguard_user');
      window.dispatchEvent(new CustomEvent('vaultguard_unauthorized'));
      throw new Error('Session expired. Please log in again.');
    }

    throw new Error(data.error || 'An API error occurred');
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<AuthResponse>(res, true);
    localStorage.setItem('vaultguard_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('vaultguard_refresh_token', data.refreshToken);
    }
    localStorage.setItem('vaultguard_user', JSON.stringify(data.user));
    return data;
  },

  async register(email: string, fullName: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName, password }),
    });
    const data = await handleResponse<AuthResponse>(res, true);
    localStorage.setItem('vaultguard_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('vaultguard_refresh_token', data.refreshToken);
    }
    localStorage.setItem('vaultguard_user', JSON.stringify(data.user));
    return data;
  },

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return handleResponse<{ token: string }>(res, true);
  },

  async getMe(): Promise<{ user: UserProfile }> {
    const res = await fetchWithAuth(`${API_BASE}/auth/me`);
    return handleResponse<{ user: UserProfile }>(res);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<{ user: UserProfile }> {
    const res = await fetchWithAuth(`${API_BASE}/user/profile`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const data = await handleResponse<{ user: UserProfile }>(res);
    localStorage.setItem('vaultguard_user', JSON.stringify(data.user));
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetchWithAuth(`${API_BASE}/user/change-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse<{ message: string }>(res);
  },

  // Passwords
  async getPasswords(params: {
    status?: 'active' | 'trash';
    category?: string;
    search?: string;
    tag?: string;
    favorite?: boolean;
    strength?: string;
    sortBy?: string;
  } = {}): Promise<{ items: PasswordItem[] }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.tag && params.tag !== 'All') query.set('tag', params.tag);
    if (params.favorite) query.set('favorite', 'true');
    if (params.strength && params.strength !== 'All') query.set('strength', params.strength);
    if (params.sortBy) query.set('sortBy', params.sortBy);

    const res = await fetchWithAuth(`${API_BASE}/passwords?${query.toString()}`);
    return handleResponse<{ items: PasswordItem[] }>(res);
  },

  async createPassword(item: Partial<PasswordItem>): Promise<{ item: PasswordItem }> {
    const res = await fetchWithAuth(`${API_BASE}/passwords`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return handleResponse<{ item: PasswordItem }>(res);
  },

  async updatePassword(id: string, updates: Partial<PasswordItem>): Promise<{ item: PasswordItem }> {
    const res = await fetchWithAuth(`${API_BASE}/passwords/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return handleResponse<{ item: PasswordItem }>(res);
  },

  async deletePassword(id: string): Promise<{ item: PasswordItem }> {
    const res = await fetchWithAuth(`${API_BASE}/passwords/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ item: PasswordItem }>(res);
  },

  async restorePassword(id: string): Promise<{ item: PasswordItem }> {
    const res = await fetchWithAuth(`${API_BASE}/passwords/${id}/restore`, {
      method: 'POST',
    });
    return handleResponse<{ item: PasswordItem }>(res);
  },

  async permanentDeletePassword(id: string): Promise<{ message: string }> {
    const res = await fetchWithAuth(`${API_BASE}/passwords/${id}/permanent`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(res);
  },

  async logCopyPassword(id: string): Promise<void> {
    await fetchWithAuth(`${API_BASE}/passwords/${id}/copy-password`, {
      method: 'POST',
    });
  },

  async logViewPassword(id: string): Promise<void> {
    await fetchWithAuth(`${API_BASE}/passwords/${id}/view-password`, {
      method: 'POST',
    });
  },

  // Categories
  async getCategories(): Promise<{ items: CategoryItem[] }> {
    const res = await fetchWithAuth(`${API_BASE}/categories`);
    return handleResponse<{ items: CategoryItem[] }>(res);
  },

  async createCategory(name: string, iconName?: string, color?: string): Promise<{ item: CategoryItem }> {
    const res = await fetchWithAuth(`${API_BASE}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name, iconName, color }),
    });
    return handleResponse<{ item: CategoryItem }>(res);
  },

  // Security Stats
  async getSecurityStats(): Promise<SecurityStats> {
    const res = await fetchWithAuth(`${API_BASE}/security/stats`);
    return handleResponse<SecurityStats>(res);
  },

  // Activities
  async getActivityTimeline(): Promise<{ items: ActivityLog[] }> {
    const res = await fetchWithAuth(`${API_BASE}/activity/timeline`);
    return handleResponse<{ items: ActivityLog[] }>(res);
  },

  // Import / Export
  async exportVault(): Promise<Blob> {
    const res = await fetchWithAuth(`${API_BASE}/vault/export`);
    if (!res.ok) throw new Error('Failed to export vault');
    return res.blob();
  },

  async importVault(csvData: string): Promise<{ message: string; importedCount: number }> {
    const res = await fetchWithAuth(`${API_BASE}/vault/import`, {
      method: 'POST',
      body: JSON.stringify({ csvData }),
    });
    return handleResponse<{ message: string; importedCount: number }>(res);
  },
};
