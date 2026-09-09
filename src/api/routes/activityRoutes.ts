import { Router } from 'express';
import { activityController } from '../controllers/activityController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { encryptedVaultRequired } from '../middleware/vaultAvailability';

const router = Router();

router.use(authenticateToken, encryptedVaultRequired);

router.get('/timeline', activityController.getActivityTimeline);
router.delete('/timeline', activityController.clearActivityTimeline);

export default router;
