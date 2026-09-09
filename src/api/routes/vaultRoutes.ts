import { Router } from 'express';
import { vaultController } from '../controllers/vaultController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { encryptedVaultRequired } from '../middleware/vaultAvailability';

const router = Router();

router.use(authenticateToken, encryptedVaultRequired);

router.get('/export', vaultController.exportVault);
router.post('/import', vaultController.importVault);

export default router;
