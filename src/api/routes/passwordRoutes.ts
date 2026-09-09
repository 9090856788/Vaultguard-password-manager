import { Router } from 'express';
import { passwordController } from '../controllers/passwordController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { encryptedVaultRequired } from '../middleware/vaultAvailability';

const router = Router();

// Apply auth middleware to all password routes
router.use(authenticateToken, encryptedVaultRequired);

router.get('/', passwordController.getPasswords);
router.post('/', passwordController.createPassword);
router.put('/:id', passwordController.updatePassword);
router.delete('/:id', passwordController.deletePassword);
router.post('/:id/restore', passwordController.restorePassword);
router.delete('/:id/permanent', passwordController.permanentDeletePassword);
router.post('/:id/copy-password', passwordController.logCopyPassword);
router.post('/:id/view-password', passwordController.logViewPassword);

export default router;
