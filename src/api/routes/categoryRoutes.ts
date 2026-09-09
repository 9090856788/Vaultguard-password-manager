import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { encryptedVaultRequired } from '../middleware/vaultAvailability';

const router = Router();

router.use(authenticateToken, encryptedVaultRequired);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
