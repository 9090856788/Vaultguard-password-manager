import { Router } from 'express';
import { activityController } from '../controllers/activityController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/timeline', activityController.getActivityTimeline);
router.delete('/timeline', activityController.clearActivityTimeline);

export default router;
