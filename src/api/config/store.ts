import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { envConfig } from './env';
import { User, PasswordItem, CategoryItem, ActivityLog } from '../types';

// Ensure data storage directory exists
if (!fs.existsSync(envConfig.DATA_DIR)) {
  fs.mkdirSync(envConfig.DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(envConfig.DATA_DIR, 'users.json');
const PASSWORDS_FILE = path.join(envConfig.DATA_DIR, 'passwords.json');
const CATEGORIES_FILE = path.join(envConfig.DATA_DIR, 'categories.json');
const ACTIVITIES_FILE = path.join(envConfig.DATA_DIR, 'activities.json');

// Memory storage cache initialized on startup
let users: User[] = [];
let passwords: PasswordItem[] = [];
let categories: CategoryItem[] = [];
let activities: ActivityLog[] = [];

// Helper file persistence handlers
function loadJSON<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`[DataStore] Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

function saveJSON<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[DataStore] Error writing to ${filePath}:`, err);
  }
}

// Initial Data Seeding
export async function seedInitialData() {
  users = loadJSON<User[]>(USERS_FILE, []);
  passwords = loadJSON<PasswordItem[]>(PASSWORDS_FILE, []);
  categories = loadJSON<CategoryItem[]>(CATEGORIES_FILE, []);
  activities = loadJSON<ActivityLog[]>(ACTIVITIES_FILE, []);

  // Seed default demo user if empty
  if (users.length === 0) {
    const demoPasswordHash = await bcrypt.hash('MasterPassword123!', 10);
    const demoUser: User = {
      id: 'usr_demo_alex',
      email: 'alex.rivera@vaultguard.io',
      fullName: 'Alex Rivera',
      passwordHash: demoPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      autoLogoutMinutes: 15,
      clipboardClearSeconds: 30,
      is2FAEnabled: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    users.push(demoUser);
    saveJSON(USERS_FILE, users);

    // Seed Categories
    if (categories.length === 0) {
      const defaultCategories: CategoryItem[] = [
        { id: 'cat_work', userId: demoUser.id, name: 'Work', iconName: 'Briefcase', color: 'indigo', isCustom: false },
        { id: 'cat_personal', userId: demoUser.id, name: 'Personal', iconName: 'User', color: 'emerald', isCustom: false },
        { id: 'cat_banking', userId: demoUser.id, name: 'Banking', iconName: 'CreditCard', color: 'amber', isCustom: false },
        { id: 'cat_shopping', userId: demoUser.id, name: 'Shopping', iconName: 'ShoppingBag', color: 'purple', isCustom: false },
        { id: 'cat_dev', userId: demoUser.id, name: 'Development', iconName: 'Code', color: 'cyan', isCustom: false },
        { id: 'cat_entertainment', userId: demoUser.id, name: 'Entertainment', iconName: 'Film', color: 'rose', isCustom: false },
        { id: 'cat_social', userId: demoUser.id, name: 'Social', iconName: 'Share2', color: 'blue', isCustom: false },
      ];
      categories.push(...defaultCategories);
      saveJSON(CATEGORIES_FILE, categories);
    }

    // Seed Sample Passwords
    if (passwords.length === 0) {
      const samplePasswords: PasswordItem[] = [
        {
          id: 'pwd_github_01',
          userId: demoUser.id,
          title: 'GitHub Enterprise',
          websiteUrl: 'https://github.com',
          username: 'arivera_dev',
          email: 'alex.rivera@vaultguard.io',
          password: 'ghp_K9m$vX9#L2pQ1!wZ8yT4uR7sP3aM',
          category: 'Development',
          notes: 'Main enterprise developer account with 2FA active.',
          tags: ['Work', 'SSH', 'OAuth'],
          colorLabel: 'indigo',
          websiteLogo: 'https://github.githubassets.com/favicons/favicon.png',
          isFavorite: true,
          isPinned: true,
          isDeleted: false,
          strengthScore: 95,
          strengthLevel: 'Very Strong',
          entropyBits: 112,
          estimatedCrackTime: '3.2 Trillion Years',
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          lastViewedAt: new Date(Date.now() - 3600000).toISOString(),
          lastCopiedAt: new Date(Date.now() - 7200000).toISOString(),
          versionNumber: 2,
          versionHistory: [
            {
              id: 'ver_01',
              password: 'OldGithubPassword2025!',
              updatedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
              updatedBy: 'Alex Rivera',
              versionNumber: 1,
            },
          ],
        },
        {
          id: 'pwd_aws_prod',
          userId: demoUser.id,
          title: 'AWS Production Console',
          websiteUrl: 'https://aws.amazon.com',
          username: 'admin_dev_ops',
          email: 'alex.rivera@vaultguard.io',
          password: 'AWS#9821_KxL!pQ#2026_SecureKey',
          category: 'Work',
          notes: 'Root console access for us-east-1 production cluster.',
          tags: ['Cloud', 'Production', 'Work'],
          colorLabel: 'amber',
          websiteLogo: 'https://a0.awsstatic.com/lib/pattern-library/4.5.1/images/icons/aws_favicon.ico',
          isFavorite: true,
          isPinned: false,
          isDeleted: false,
          strengthScore: 92,
          strengthLevel: 'Very Strong',
          entropyBits: 104,
          estimatedCrackTime: '820 Billion Years',
          createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          lastViewedAt: new Date(Date.now() - 86400000).toISOString(),
          versionNumber: 1,
          versionHistory: [],
        },
        {
          id: 'pwd_chase_bank',
          userId: demoUser.id,
          title: 'Chase Banking',
          websiteUrl: 'https://chase.com',
          username: 'alex_chase_vault',
          email: 'alex.rivera@vaultguard.io',
          password: 'Chas3_B@nk2026!#Live',
          category: 'Banking',
          notes: 'Personal checking and savings vault account.',
          tags: ['Finance', 'Personal'],
          colorLabel: 'emerald',
          websiteLogo: 'https://www.chase.com/etc/designs/chase-ux/favicon.ico',
          isFavorite: false,
          isPinned: false,
          isDeleted: false,
          strengthScore: 88,
          strengthLevel: 'Strong',
          entropyBits: 88,
          estimatedCrackTime: '1.4 Million Years',
          createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          versionNumber: 1,
          versionHistory: [],
        },
        {
          id: 'pwd_netflix_home',
          userId: demoUser.id,
          title: 'Netflix Premium',
          websiteUrl: 'https://netflix.com',
          username: 'alex.rivera@vaultguard.io',
          email: 'alex.rivera@vaultguard.io',
          password: 'Password123', // Weak password for security score testing
          category: 'Entertainment',
          notes: 'Shared family subscription account.',
          tags: ['Personal', 'Entertainment'],
          colorLabel: 'rose',
          isFavorite: false,
          isPinned: false,
          isDeleted: false,
          strengthScore: 25,
          strengthLevel: 'Weak',
          entropyBits: 32,
          estimatedCrackTime: '3 Minutes',
          createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
          versionNumber: 1,
          versionHistory: [],
        },
      ];
      passwords.push(...samplePasswords);
      saveJSON(PASSWORDS_FILE, passwords);
    }

    // Seed Activity Log
    if (activities.length === 0) {
      activities.push({
        id: 'act_seed_01',
        userId: demoUser.id,
        action: 'Master Vault Unlocked',
        details: 'Logged into ShieldVault Pro via Argon2id authenticated session.',
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString(),
      });
      saveJSON(ACTIVITIES_FILE, activities);
    }
  }
}

// Call data seed immediately
seedInitialData().catch((err) => {
  console.error('[DataStore] Seed failed:', err);
});

// Getters and Mutators for JSON store
export const store = {
  getUsers: (): User[] => users,
  saveUsers: (data: User[]) => {
    users = data;
    saveJSON(USERS_FILE, users);
  },

  getPasswords: (): PasswordItem[] => passwords,
  savePasswords: (data: PasswordItem[]) => {
    passwords = data;
    saveJSON(PASSWORDS_FILE, passwords);
  },

  getCategories: (): CategoryItem[] => categories,
  saveCategories: (data: CategoryItem[]) => {
    categories = data;
    saveJSON(CATEGORIES_FILE, categories);
  },

  getActivities: (): ActivityLog[] => activities,
  saveActivities: (data: ActivityLog[]) => {
    activities = data;
    saveJSON(ACTIVITIES_FILE, activities);
  },

  addActivity: (userId: string, action: string, details: string, passwordId?: string, passwordTitle?: string, ipAddress?: string) => {
    const newLog: ActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      action,
      details,
      passwordId,
      passwordTitle,
      ipAddress: ipAddress || '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    activities.unshift(newLog); // newest first
    saveJSON(ACTIVITIES_FILE, activities);
  },
};
