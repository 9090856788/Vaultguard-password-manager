import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken } from '../middlewares/authMiddleware';
import { vaultLifecycleController } from '../controllers/vaultLifecycleController';

const router = Router();

router.use(authenticateToken);
router.post('/prepare', asyncHandler(vaultLifecycleController.prepare));
router.post('/:vaultId/finalize', asyncHandler(vaultLifecycleController.finalize));
router.get('/', asyncHandler(vaultLifecycleController.list));
router.get('/:vaultId/key-material', asyncHandler(vaultLifecycleController.keyMaterial));
router.patch('/:vaultId', asyncHandler(vaultLifecycleController.updateMetadata));

export default router;
