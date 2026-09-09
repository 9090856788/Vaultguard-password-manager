import { Response } from 'express';
import { store } from '../config/store';
import { AuthenticatedRequest } from '../types';

export const auditController = {
  async getSecurityStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const passwords = store.getPasswords().filter((p) => p.userId === userId && !p.isDeleted);

      const totalPasswords = passwords.length;
      const favoriteCount = passwords.filter((p) => p.isFavorite).length;

      let weakCount = 0;
      let mediumCount = 0;
      let strongCount = 0;
      let veryStrongCount = 0;

      passwords.forEach((p) => {
        if (p.strengthLevel === 'Weak') weakCount++;
        else if (p.strengthLevel === 'Medium') mediumCount++;
        else if (p.strengthLevel === 'Strong') strongCount++;
        else if (p.strengthLevel === 'Very Strong') veryStrongCount++;
      });

      // Find duplicate / reused passwords
      const passMap = new Map<string, number>();
      passwords.forEach((p) => {
        const count = passMap.get(p.password) || 0;
        passMap.set(p.password, count + 1);
      });

      let duplicateCount = 0;
      passMap.forEach((count) => {
        if (count > 1) duplicateCount += count;
      });

      // Passwords older than 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const oldPasswordsCount = passwords.filter((p) => p.updatedAt < ninetyDaysAgo).length;

      // Calculate overall health score (0-100%)
      let overallScore = 100;
      if (totalPasswords > 0) {
        const weakPenalty = (weakCount / totalPasswords) * 50;
        const mediumPenalty = (mediumCount / totalPasswords) * 20;
        const reusedPenalty = (duplicateCount / totalPasswords) * 30;
        overallScore = Math.max(0, Math.round(100 - weakPenalty - mediumPenalty - reusedPenalty));
      }

      // Sorted recently added & updated
      const recentlyAdded = [...passwords]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const recentlyUpdated = [...passwords]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

      // Categories count
      const categoriesCount: Record<string, number> = {};
      passwords.forEach((p) => {
        categoriesCount[p.category] = (categoriesCount[p.category] || 0) + 1;
      });

      res.json({
        totalPasswords,
        favoriteCount,
        favoritesCount: favoriteCount,
        weakCount,
        mediumCount,
        strongCount: strongCount + veryStrongCount,
        duplicateCount,
        reusedCount: duplicateCount,
        oldPasswordsCount,
        overallScore,
        healthScore: overallScore,
        strengthDistribution: {
          weak: weakCount,
          medium: mediumCount,
          strong: strongCount,
          veryStrong: veryStrongCount,
        },
        categoriesCount,
        recentlyAdded,
        recentlyUpdated,
        lastAuditAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch security stats.' });
    }
  },
};
