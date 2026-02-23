import { Router, Request, Response } from 'express';
import { ApplicationAnalysisService } from '../services/applicationAnalysis.service';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
const router = Router();
router.post(
  '/analyze-application/:applicationId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { applicationId } = req.params;
      const { cvFileId, language = 'tr' } = req.body;
      const userId = req.user!.id;
      if (!cvFileId) {
        return res.status(400).json({
          error: 'CV file ID is required',
        });
      }
      const analysis = await ApplicationAnalysisService.analyzeApplication(
        applicationId,
        cvFileId,
        userId,
        language
      );
      return res.json(analysis);
    } catch (error) {
      console.error('Application analysis error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Unauthorized')) {
          return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('not configured')) {
          return res.status(503).json({ error: error.message });
        }
        if (error.message.includes('rate limit')) {
          return res.status(429).json({ error: error.message });
        }
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to analyze application' });
    }
  }
);
router.get(
  '/application-analysis/:applicationId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { applicationId } = req.params;
      const userId = req.user!.id;
      const analysis = await ApplicationAnalysisService.getAnalysis(applicationId, userId);
      if (!analysis) {
        return res.status(404).json({
          error: 'No analysis found for this application',
        });
      }
      return res.json(analysis);
    } catch (error) {
      console.error('Get analysis error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
      }
      return res.status(500).json({ error: 'Failed to retrieve analysis' });
    }
  }
);
router.get('/my-analyses', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const analyses = await ApplicationAnalysisService.listUserAnalyses(userId, limit);
    return res.json(analyses);
  } catch (error) {
    console.error('List analyses error:', error);
    return res.status(500).json({ error: 'Failed to retrieve analyses' });
  }
});
router.get('/analysis-stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await ApplicationAnalysisService.getUserStats(userId);
    return res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});
export default router;
