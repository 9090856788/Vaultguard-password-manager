import { Response } from 'express';
import { store } from '../config/store';
import { AuthenticatedRequest, CategoryItem } from '../types';

export const categoryController = {
  async getCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const categories = store.getCategories().filter((c) => c.userId === userId);
      const passwords = store.getPasswords().filter((p) => p.userId === userId && !p.isDeleted);

      const itemsWithCount = categories.map((cat) => {
        const count = passwords.filter((p) => p.category.toLowerCase() === cat.name.toLowerCase()).length;
        return { ...cat, count };
      });

      res.json({ items: itemsWithCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch categories.' });
    }
  },

  async createCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { name, iconName = 'Folder', color = 'indigo' } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Category name is required.' });
        return;
      }

      const categories = store.getCategories();
      const existing = categories.find((c) => c.userId === userId && c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        res.status(400).json({ error: 'Category with this name already exists.' });
        return;
      }

      const newCategory: CategoryItem = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        userId,
        name,
        iconName,
        color,
        isCustom: true,
        count: 0,
      };

      categories.push(newCategory);
      store.saveCategories(categories);

      store.addActivity(userId, 'Custom Category Created', `Created custom folder/category '${name}'.`, undefined, undefined, req.ip);

      res.status(201).json({ item: newCategory });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create category.' });
    }
  },

  async deleteCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { id } = req.params;

      let categories = store.getCategories();
      const cat = categories.find((c) => c.id === id && c.userId === userId);

      if (!cat) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }

      if (!cat.isCustom) {
        res.status(400).json({ error: 'Default categories cannot be deleted.' });
        return;
      }

      categories = categories.filter((c) => !(c.id === id && c.userId === userId));
      store.saveCategories(categories);

      res.json({ message: 'Category deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete category.' });
    }
  },
};
