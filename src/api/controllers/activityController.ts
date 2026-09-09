import { Response } from 'express';
import { store } from '../config/store';
import { AuthenticatedRequest } from '../types';

export const activityController = {
  async getActivityTimeline(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const activities = store.getActivities().filter((a) => a.userId === userId);
      res.json({ items: activities });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch activity logs.' });
    }
  },

  async clearActivityTimeline(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      let activities = store.getActivities().filter((a) => a.userId !== userId);
      store.saveActivities(activities);
      store.addActivity(userId, 'Activity Log Cleared', 'Purged audit history logs.', undefined, undefined, req.ip);
      res.json({ message: 'Activity log history cleared.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to clear activity logs.' });
    }
  },
};
