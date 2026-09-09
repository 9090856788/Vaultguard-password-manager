import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { encryptedVaultRequired } from '../middleware/vaultAvailability';

const router = Router();

router.use(authenticateToken, encryptedVaultRequired);

router.get('/stats', auditController.getSecurityStats);

export default router;
