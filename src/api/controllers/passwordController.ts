import { Response } from 'express';
import { store } from '../config/store';
import { calculatePasswordStrength } from '../utils/passwordUtils';
import { AuthenticatedRequest, PasswordItem, PasswordVersion } from '../types';

export const passwordController = {
  async getPasswords(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { status = 'active', category, search, tag, favorite, strength, sortBy = 'updatedRecently' } = req.query;

      let items = store.getPasswords().filter((p) => p.userId === userId);

      // Status filter
      if (status === 'trash') {
        items = items.filter((p) => p.isDeleted);
      } else {
        items = items.filter((p) => !p.isDeleted);
      }

      // Category filter
      if (category && category !== 'All') {
        items = items.filter((p) => p.category.toLowerCase() === String(category).toLowerCase());
      }

      // Favorite filter
      if (favorite === 'true') {
        items = items.filter((p) => p.isFavorite);
      }

      // Strength filter
      if (strength && strength !== 'All') {
        items = items.filter((p) => p.strengthLevel.toLowerCase() === String(strength).toLowerCase());
      }

      // Tag filter
      if (tag && tag !== 'All') {
        items = items.filter((p) => p.tags.some((t) => t.toLowerCase() === String(tag).toLowerCase()));
      }

      // Search query filter
      if (search) {
        const q = String(search).toLowerCase();
        items = items.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.websiteUrl.toLowerCase().includes(q) ||
            p.username.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q) ||
            (p.notes && p.notes.toLowerCase().includes(q)) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      // Sorting logic
      items.sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'az') return a.title.localeCompare(b.title);
        if (sortBy === 'za') return b.title.localeCompare(a.title);
        // Default: updatedRecently
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      res.json({ items });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch passwords.' });
    }
  },

  async createPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const {
        title,
        websiteUrl,
        username,
        email,
        password,
        category = 'Personal',
        notes = '',
        tags = [],
        colorLabel = 'indigo',
        websiteLogo,
        isFavorite = false,
      } = req.body;

      if (!title || !password) {
        res.status(400).json({ error: 'Title and password are required.' });
        return;
      }

      const strength = calculatePasswordStrength(password);

      const newPassword: PasswordItem = {
        id: `pwd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        title,
        websiteUrl: websiteUrl || '',
        username: username || '',
        email: email || '',
        password,
        category,
        notes,
        tags: Array.isArray(tags) ? tags : [],
        colorLabel,
        websiteLogo: websiteLogo || undefined,
        isFavorite: Boolean(isFavorite),
        isPinned: false,
        isDeleted: false,
        strengthScore: strength.score,
        strengthLevel: strength.level,
        entropyBits: strength.entropyBits,
        estimatedCrackTime: strength.estimatedCrackTime,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versionNumber: 1,
        versionHistory: [],
      };

      const passwords = store.getPasswords();
      passwords.unshift(newPassword);
      store.savePasswords(passwords);

      store.addActivity(userId, 'Password Added', `Created credential for ${title}.`, newPassword.id, newPassword.title, req.ip);

      res.status(201).json({ item: newPassword });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create password.' });
    }
  },

  async updatePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { id } = req.params;

      const passwords = store.getPasswords();
      const pwd = passwords.find((p) => p.id === id && p.userId === userId);

      if (!pwd) {
        res.status(404).json({ error: 'Password item not found.' });
        return;
      }

      const {
        title,
        websiteUrl,
        username,
        email,
        password,
        category,
        notes,
        tags,
        colorLabel,
        websiteLogo,
        isFavorite,
      } = req.body;

      // Handle password rotation & version history if password changed
      if (password && password !== pwd.password) {
        const oldVersion: PasswordVersion = {
          id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          password: pwd.password,
          updatedAt: pwd.updatedAt,
          updatedBy: 'Self',
          versionNumber: pwd.versionNumber,
        };
        pwd.versionHistory = [oldVersion, ...pwd.versionHistory];
        pwd.versionNumber += 1;
        pwd.password = password;

        const strength = calculatePasswordStrength(password);
        pwd.strengthScore = strength.score;
        pwd.strengthLevel = strength.level;
        pwd.entropyBits = strength.entropyBits;
        pwd.estimatedCrackTime = strength.estimatedCrackTime;

        store.addActivity(userId, 'Password Rotated', `Rotated password for ${pwd.title} (v${pwd.versionNumber}).`, pwd.id, pwd.title, req.ip);
      }

      if (title !== undefined) pwd.title = title;
      if (websiteUrl !== undefined) pwd.websiteUrl = websiteUrl;
      if (username !== undefined) pwd.username = username;
      if (email !== undefined) pwd.email = email;
      if (category !== undefined) pwd.category = category;
      if (notes !== undefined) pwd.notes = notes;
      if (tags !== undefined) pwd.tags = Array.isArray(tags) ? tags : [];
      if (colorLabel !== undefined) pwd.colorLabel = colorLabel;
      if (websiteLogo !== undefined) pwd.websiteLogo = websiteLogo;
      if (isFavorite !== undefined) pwd.isFavorite = Boolean(isFavorite);

      pwd.updatedAt = new Date().toISOString();

      store.savePasswords(passwords);
      store.addActivity(userId, 'Credential Updated', `Updated fields for ${pwd.title}.`, pwd.id, pwd.title, req.ip);

      res.json({ item: pwd });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update password.' });
    }
  },

  async deletePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { id } = req.params;

      const passwords = store.getPasswords();
      const pwd = passwords.find((p) => p.id === id && p.userId === userId);

      if (!pwd) {
        res.status(404).json({ error: 'Password item not found.' });
        return;
      }

      pwd.isDeleted = true;
      pwd.deletedAt = new Date().toISOString();

      store.savePasswords(passwords);
      store.addActivity(userId, 'Moved to Trash', `Moved credential ${pwd.title} to trash bin.`, pwd.id, pwd.title, req.ip);

      res.json({ item: pwd });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete password.' });
    }
  },

  async restorePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { id } = req.params;

      const passwords = store.getPasswords();
      const pwd = passwords.find((p) => p.id === id && p.userId === userId);

      if (!pwd) {
        res.status(404).json({ error: 'Password item not found.' });
        return;
      }

      pwd.isDeleted = false;
      pwd.deletedAt = undefined;

      store.savePasswords(passwords);
      store.addActivity(userId, 'Restored Credential', `Restored ${pwd.title} from trash bin.`, pwd.id, pwd.title, req.ip);

      res.json({ item: pwd });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to restore password.' });
    }
  },

  async permanentDeletePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { id } = req.params;

      let passwords = store.getPasswords();
      const pwd = passwords.find((p) => p.id === id && p.userId === userId);

      if (!pwd) {
        res.status(404).json({ error: 'Password item not found.' });
        return;
      }

      passwords = passwords.filter((p) => !(p.id === id && p.userId === userId));
      store.savePasswords(passwords);

      store.addActivity(userId, 'Permanently Deleted', `Permanently purged ${pwd.title} from zero-knowledge store.`, pwd.id, pwd.title, req.ip);

      res.json({ message: 'Credential permanently purged from storage.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to permanently delete password.' });
    }
  },

  async logCopyPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { id } = req.params;

      const passwords = store.getPasswords();
      const pwd = passwords.find((p) => p.id === id && p.userId === userId);

      if (pwd) {
        pwd.lastCopiedAt = new Date().toISOString();
        store.savePasswords(passwords);
        store.addActivity(userId, 'Password Copied', `Copied password for ${pwd.title} to clipboard.`, pwd.id, pwd.title, req.ip);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to log copy.' });
    }
  },

  async logViewPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { id } = req.params;

      const passwords = store.getPasswords();
      const pwd = passwords.find((p) => p.id === id && p.userId === userId);

      if (pwd) {
        pwd.lastViewedAt = new Date().toISOString();
        store.savePasswords(passwords);
        store.addActivity(userId, 'Password Decrypted', `Decrypted and viewed password for ${pwd.title}.`, pwd.id, pwd.title, req.ip);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to log view.' });
    }
  },
};
