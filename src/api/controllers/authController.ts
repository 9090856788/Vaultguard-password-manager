import { Request, Response } from 'express';
import { store } from '../config/store';
import { hashPassword, comparePassword } from '../utils/passwordUtils';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokenUtils';
import { AuthenticatedRequest, User, CategoryItem } from '../types';

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, password, fullName } = req.body;

      if (!email || !password || !fullName) {
        res.status(400).json({ error: 'Email, password, and full name are required.' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Master password must be at least 8 characters long.' });
        return;
      }

      const users = store.getUsers();
      const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        res.status(400).json({ error: 'Account with this email already exists.' });
        return;
      }

      const passwordHash = await hashPassword(password);
      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email,
        fullName,
        passwordHash,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        autoLogoutMinutes: 15,
        clipboardClearSeconds: 30,
        is2FAEnabled: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      users.push(newUser);
      store.saveUsers(users);

      // Create default categories for new user
      const categories = store.getCategories();
      const defaultCats: CategoryItem[] = [
        { id: `cat_${Date.now()}_1`, userId: newUser.id, name: 'Work', iconName: 'Briefcase', color: 'indigo', isCustom: false },
        { id: `cat_${Date.now()}_2`, userId: newUser.id, name: 'Personal', iconName: 'User', color: 'emerald', isCustom: false },
        { id: `cat_${Date.now()}_3`, userId: newUser.id, name: 'Banking', iconName: 'CreditCard', color: 'amber', isCustom: false },
        { id: `cat_${Date.now()}_4`, userId: newUser.id, name: 'Shopping', iconName: 'ShoppingBag', color: 'purple', isCustom: false },
        { id: `cat_${Date.now()}_5`, userId: newUser.id, name: 'Development', iconName: 'Code', color: 'cyan', isCustom: false },
        { id: `cat_${Date.now()}_6`, userId: newUser.id, name: 'Entertainment', iconName: 'Film', color: 'rose', isCustom: false },
        { id: `cat_${Date.now()}_7`, userId: newUser.id, name: 'Social', iconName: 'Share2', color: 'blue', isCustom: false },
      ];
      categories.push(...defaultCats);
      store.saveCategories(categories);

      store.addActivity(newUser.id, 'Account Created', 'Registered new zero-knowledge master vault account.', undefined, undefined, req.ip);

      const token = signAccessToken({ id: newUser.id, email: newUser.email });
      const refreshToken = signRefreshToken({ id: newUser.id, email: newUser.email });

      res.status(201).json({
        message: 'Account registered successfully.',
        token,
        refreshToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          avatarUrl: newUser.avatarUrl,
          autoLogoutMinutes: newUser.autoLogoutMinutes,
          clipboardClearSeconds: newUser.clipboardClearSeconds,
          is2FAEnabled: newUser.is2FAEnabled,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Registration failed.' });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and master password are required.' });
        return;
      }

      const users = store.getUsers();
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        res.status(401).json({ error: 'Invalid email or master password.' });
        return;
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        store.addActivity(user.id, 'Failed Login Attempt', 'Incorrect master password supplied.', undefined, undefined, req.ip);
        res.status(401).json({ error: 'Invalid email or master password.' });
        return;
      }

      user.lastLoginAt = new Date().toISOString();
      store.saveUsers(users);

      store.addActivity(user.id, 'Master Vault Unlocked', 'Successfully unlocked zero-knowledge vault session.', undefined, undefined, req.ip);

      const token = signAccessToken({ id: user.id, email: user.email });
      const refreshToken = signRefreshToken({ id: user.id, email: user.email });

      res.json({
        message: 'Master vault unlocked.',
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          autoLogoutMinutes: user.autoLogoutMinutes,
          clipboardClearSeconds: user.clipboardClearSeconds,
          is2FAEnabled: user.is2FAEnabled,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Login failed.' });
    }
  },

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token is required.' });
        return;
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        res.status(401).json({ error: 'Invalid or expired refresh token.' });
        return;
      }

      const newToken = signAccessToken({ id: decoded.id, email: decoded.email });
      res.json({ token: newToken });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Token refresh failed.' });
    }
  },

  async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const users = store.getUsers();
      const user = users.find((u) => u.id === req.user?.id);

      if (!user) {
        res.status(404).json({ error: 'User profile not found.' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          autoLogoutMinutes: user.autoLogoutMinutes,
          clipboardClearSeconds: user.clipboardClearSeconds,
          is2FAEnabled: user.is2FAEnabled,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch user profile.' });
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const users = store.getUsers();
      const user = users.find((u) => u.id === req.user?.id);

      if (!user) {
        res.status(404).json({ error: 'User profile not found.' });
        return;
      }

      const { fullName, avatarUrl, autoLogoutMinutes, clipboardClearSeconds, is2FAEnabled } = req.body;

      if (fullName !== undefined) user.fullName = fullName;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
      if (autoLogoutMinutes !== undefined) user.autoLogoutMinutes = Number(autoLogoutMinutes);
      if (clipboardClearSeconds !== undefined) user.clipboardClearSeconds = Number(clipboardClearSeconds);
      if (is2FAEnabled !== undefined) user.is2FAEnabled = Boolean(is2FAEnabled);

      store.saveUsers(users);
      store.addActivity(user.id, 'Profile Settings Updated', 'Updated security preferences and settings.', undefined, undefined, req.ip);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          autoLogoutMinutes: user.autoLogoutMinutes,
          clipboardClearSeconds: user.clipboardClearSeconds,
          is2FAEnabled: user.is2FAEnabled,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Profile update failed.' });
    }
  },

  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required.' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ error: 'New master password must be at least 8 characters.' });
        return;
      }

      const users = store.getUsers();
      const user = users.find((u) => u.id === req.user?.id);

      if (!user) {
        res.status(404).json({ error: 'User profile not found.' });
        return;
      }

      const isMatch = await comparePassword(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ error: 'Current master password is incorrect.' });
        return;
      }

      user.passwordHash = await hashPassword(newPassword);
      store.saveUsers(users);

      store.addActivity(user.id, 'Master Password Changed', 'Master password key successfully re-derived.', undefined, undefined, req.ip);

      res.json({ message: 'Master password changed successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Password change failed.' });
    }
  },
};
