import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken } from '../middlewares/authMiddleware';
import { vaultItemController } from '../controllers/vaultItemController';

const router = Router();

router.use(authenticateToken);
router.post('/:vaultId/items/prepare', asyncHandler(vaultItemController.prepare));
router.post('/:vaultId/items', asyncHandler(vaultItemController.finalize));
router.get('/:vaultId/items', asyncHandler(vaultItemController.list));
router.get('/:vaultId/items/:itemId', asyncHandler(vaultItemController.get));
router.patch('/:vaultId/items/:itemId', asyncHandler(vaultItemController.update));
router.delete('/:vaultId/items/:itemId', asyncHandler(vaultItemController.remove));
router.post('/:vaultId/items/:itemId/restore', asyncHandler(vaultItemController.restore));

export default router;
