import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  avatarUrl?: string;
  autoLogoutMinutes: number;
  clipboardClearSeconds: number;
  is2FAEnabled: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface PasswordVersion {
  id: string;
  password: string;
  updatedAt: string;
  updatedBy: string;
  versionNumber: number;
}

export interface PasswordItem {
  id: string;
  userId: string;
  title: string;
  websiteUrl: string;
  username: string;
  email: string;
  password: string;
  category: string;
  notes?: string;
  tags: string[];
  colorLabel: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate';
  websiteLogo?: string;
  isFavorite: boolean;
  isPinned?: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  strengthScore: number;
  strengthLevel: 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  entropyBits: number;
  estimatedCrackTime: string;
  createdAt: string;
  updatedAt: string;
  lastViewedAt?: string;
  lastCopiedAt?: string;
  versionNumber: number;
  versionHistory: PasswordVersion[];
}

export interface CategoryItem {
  id: string;
  userId: string;
  name: string;
  iconName: string;
  color: string;
  isCustom: boolean;
  count?: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  passwordId?: string;
  passwordTitle?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: 'access';
    securityVersion: number;
  };
  requestId?: string;
}
