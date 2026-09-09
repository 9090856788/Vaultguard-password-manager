import { Router } from 'express';
import { vaultController } from '../controllers/vaultController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/export', vaultController.exportVault);
router.post('/import', vaultController.importVault);

export default router;
