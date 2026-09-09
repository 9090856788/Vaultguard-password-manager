import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/stats', auditController.getSecurityStats);

export default router;
