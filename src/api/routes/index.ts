import { Router } from 'express';
import authRoutes from './authRoutes';
import passwordRoutes from './passwordRoutes';
import categoryRoutes from './categoryRoutes';
import activityRoutes from './activityRoutes';
import auditRoutes from './auditRoutes';
import vaultRoutes from './vaultRoutes';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const apiRouter = Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ShieldVault REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Auth Routes (/api/v1/auth)
apiRouter.use('/auth', authRoutes);

// Direct User Profile Alias Routes (/api/v1/user/profile & /api/v1/user/change-password)
apiRouter.put('/user/profile', authenticateToken, authController.updateProfile);
apiRouter.post('/user/change-password', authenticateToken, authController.changePassword);

// Password CRUD Routes (/api/v1/passwords)
apiRouter.use('/passwords', passwordRoutes);

// Category Routes (/api/v1/categories)
apiRouter.use('/categories', categoryRoutes);

// Activity Timeline Routes (/api/v1/activity)
apiRouter.use('/activity', activityRoutes);

// Security & Audit Routes (/api/v1/security)
apiRouter.use('/security', auditRoutes);

// Vault Backup Import/Export Routes (/api/v1/vault)
apiRouter.use('/vault', vaultRoutes);

export default apiRouter;
