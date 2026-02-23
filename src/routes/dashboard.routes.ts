import { Router, Response } from 'express';
import { ApplicationService } from '../services';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
const router = Router();
router.use(requireAuth);
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await ApplicationService.getUserStats(userId);
    return res.status(200).json({
      data: stats,
    });
  } catch (error) {
    console.error('User stats retrieval error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
router.get('/activity', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Days parameter must be between 1 and 365',
        },
      });
    }
    const activity = await ApplicationService.getRecentActivity(userId, days);
    return res.status(200).json({
      data: activity,
    });
  } catch (error) {
    console.error('Recent activity retrieval error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
export default router;
