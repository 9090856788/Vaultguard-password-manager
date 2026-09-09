/**
 * VaultGuard Enterprise Password Manager Type Definitions
 */

export type CategoryType = 
  | 'Work'
  | 'Personal'
  | 'Social Media'
  | 'Banking'
  | 'Shopping'
  | 'Development'
  | 'Entertainment'
  | string;

export type ColorLabel = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate';

export type PasswordStrength = 'Weak' | 'Medium' | 'Strong' | 'Very Strong';

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
  password: string; // Encrypted in transit/storage, decrypted on client
  category: CategoryType;
  notes?: string;
  tags: string[];
  colorLabel: ColorLabel;
  websiteLogo?: string;
  isFavorite: boolean;
  isPinned?: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  strengthScore: number; // 0 - 100
  strengthLevel: PasswordStrength;
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
  name: string;
  iconName: string;
  color: string;
  isCustom: boolean;
  count?: number;
}

export type ActivityAction = 
  | 'CREATED' 
  | 'UPDATED' 
  | 'DELETED' 
  | 'RESTORED' 
  | 'PERMANENTLY_DELETED' 
  | 'VIEWED' 
  | 'COPIED_PASSWORD' 
  | 'COPIED_USERNAME' 
  | 'EXPORTED_VAULT' 
  | 'IMPORTED_VAULT' 
  | 'CHANGED_MASTER_PASSWORD';

export interface ActivityLog {
  id: string;
  userId: string;
  action: ActivityAction;
  passwordId?: string;
  passwordTitle?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SecurityStats {
  totalPasswords: number;
  favoriteCount: number;
  weakCount: number;
  duplicateCount: number;
  reusedCount: number;
  oldPasswordsCount: number; // > 90 days
  overallScore: number; // 0 - 100
  strengthDistribution: {
    weak: number;
    medium: number;
    strong: number;
    veryStrong: number;
  };
  categoriesCount: Record<string, number>;
  recentlyUpdated: PasswordItem[];
  recentlyAdded: PasswordItem[];
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  autoLogoutMinutes: number;
  clipboardClearSeconds: number;
  is2FAEnabled: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean; // e.g. i, l, 1, L, o, 0, O
  excludeAmbiguous: boolean; // e.g. { } [ ] ( ) / \ ' " ~ , ; . < >
}

export interface FilterOptions {
  searchQuery: string;
  category: string | 'All';
  tag: string | 'All';
  isFavorite: boolean;
  strength: 'All' | PasswordStrength;
  status: 'active' | 'trash';
  sortBy: 'a-z' | 'z-a' | 'newest' | 'oldest' | 'updated';
  viewMode: 'grid' | 'table';
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
  refreshToken: string;
}
