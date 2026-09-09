import { Response } from 'express';
import { store } from '../config/store';
import { calculatePasswordStrength } from '../utils/passwordUtils';
import { AuthenticatedRequest, PasswordItem } from '../types';

export const vaultController = {
  async exportVault(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const passwords = store.getPasswords().filter((p) => p.userId === userId && !p.isDeleted);

      // Generate CSV output
      let csvContent = 'title,websiteUrl,username,email,password,category,notes,tags\n';
      passwords.forEach((p) => {
        const title = `"${(p.title || '').replace(/"/g, '""')}"`;
        const websiteUrl = `"${(p.websiteUrl || '').replace(/"/g, '""')}"`;
        const username = `"${(p.username || '').replace(/"/g, '""')}"`;
        const email = `"${(p.email || '').replace(/"/g, '""')}"`;
        const password = `"${(p.password || '').replace(/"/g, '""')}"`;
        const category = `"${(p.category || '').replace(/"/g, '""')}"`;
        const notes = `"${(p.notes || '').replace(/"/g, '""')}"`;
        const tags = `"${(p.tags || []).join(',').replace(/"/g, '""')}"`;

        csvContent += `${title},${websiteUrl},${username},${email},${password},${category},${notes},${tags}\n`;
      });

      store.addActivity(userId, 'Vault Exported', 'Exported encrypted vault backup CSV file.', undefined, undefined, req.ip);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ShieldVault_Backup_Encrypted.csv"');
      res.send(csvContent);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Export failed.' });
    }
  },

  async importVault(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { csvData } = req.body;

      if (!csvData) {
        res.status(400).json({ error: 'CSV or JSON data payload required.' });
        return;
      }

      const lines = String(csvData).split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        res.status(400).json({ error: 'CSV file must contain a header row and at least one credential row.' });
        return;
      }

      const passwords = store.getPasswords();
      let importedCount = 0;

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());

        const title = cols[0] || 'Imported Account';
        const websiteUrl = cols[1] || '';
        const username = cols[2] || '';
        const email = cols[3] || '';
        const password = cols[4] || 'ChangeMe123!';
        const category = cols[5] || 'Personal';
        const notes = cols[6] || 'Imported from external CSV backup.';
        const tagStr = cols[7] || '';
        const tags = tagStr ? tagStr.split(';').map((t) => t.trim()) : ['Imported'];

        const strength = calculatePasswordStrength(password);

        const newPwd: PasswordItem = {
          id: `pwd_imp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
          userId,
          title,
          websiteUrl,
          username,
          email,
          password,
          category,
          notes,
          tags,
          colorLabel: 'indigo',
          isFavorite: false,
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

        passwords.unshift(newPwd);
        importedCount++;
      }

      store.savePasswords(passwords);
      store.addActivity(userId, 'Vault Imported', `Successfully imported ${importedCount} credentials into vault.`, undefined, undefined, req.ip);

      res.json({
        message: `Imported ${importedCount} credentials successfully.`,
        importedCount,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Import failed.' });
    }
  },
};
