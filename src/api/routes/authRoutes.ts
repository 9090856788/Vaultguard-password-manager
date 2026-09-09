import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Public auth routes with strict rate limiting
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh-token', authRateLimiter, authController.refreshToken);

// Protected profile & user settings routes
router.get('/me', authenticateToken, authController.getMe);
router.put('/user/profile', authenticateToken, authController.updateProfile);
router.post('/user/change-password', authenticateToken, authController.changePassword);

export default router;
