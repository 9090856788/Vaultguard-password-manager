import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Public auth routes with strict rate limiting
router.post('/register', authRateLimiter, asyncHandler(authController.register));
router.post('/login', authRateLimiter, asyncHandler(authController.login));
router.post('/refresh', authRateLimiter, csrfProtection, asyncHandler(authController.refreshToken));
router.post('/refresh-token', authRateLimiter, csrfProtection, asyncHandler(authController.refreshToken));
router.post('/logout', csrfProtection, asyncHandler(authController.logout));

// Protected profile & user settings routes
router.get('/me', authenticateToken, asyncHandler(authController.getMe));
router.put('/user/profile', authenticateToken, asyncHandler(authController.updateProfile));
router.post('/user/change-password', authenticateToken, asyncHandler(authController.changePassword));

export default router;
