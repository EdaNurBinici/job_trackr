import { Router, Response } from 'express';
import { CVAnalysisService } from '../services/cvAnalysis.service';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { cvAnalysisQueue, isQueueConfigured } from '../config/queue';
const router = Router();
router.use(requireAuth);
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { cvFileId, jobDescription, jobUrl } = req.body;
    if (!cvFileId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CV file ID is required',
        },
      });
    }
    if (!jobDescription || jobDescription.trim().length < 50) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Job description must be at least 50 characters',
        },
      });
    }
    if (isQueueConfigured()) {
      const job = await cvAnalysisQueue.add('analyze', {
        cvFileId,
        jobDescription: jobDescription.trim(),
        userId,
        jobUrl: jobUrl?.trim(),
      });
      return res.status(202).json({
        data: {
          jobId: job.id,
          status: 'queued',
          message: 'Analysis started. Check status with job ID.',
        },
      });
    } else {
      console.log('[CV Analysis] Queue not configured, processing synchronously');
      const analysis = await CVAnalysisService.analyzeCV(
        cvFileId,
        jobDescription,
        userId,
        jobUrl
      );
      return res.status(201).json({
        data: {
          id: analysis.id,
          cvFileId: analysis.cvFileId,
          matchScore: analysis.matchScore,
          missingSkills: analysis.missingSkills,
          recommendations: analysis.recommendations,
          jobUrl: analysis.jobUrl,
          createdAt: analysis.createdAt,
        },
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
      }
      if (
        error.message.includes('at least') ||
        error.message.includes('Only PDF') ||
        error.message.includes('not configured')
      ) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
    }
    console.error('CV analysis error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to analyze CV. Please try again.',
      },
    });
  }
});
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const analysisId = req.params.id;
    const analysis = await CVAnalysisService.getAnalysis(analysisId, userId);
    return res.status(200).json({
      data: {
        id: analysis.id,
        cvFileId: analysis.cvFileId,
        jobDescription: analysis.jobDescription,
        jobUrl: analysis.jobUrl,
        matchScore: analysis.matchScore,
        missingSkills: analysis.missingSkills,
        recommendations: analysis.recommendations,
        createdAt: analysis.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Analysis not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
      }
    }
    console.error('Get analysis error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
router.get('/job/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    if (!isQueueConfigured()) {
      return res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Queue system is not configured',
        },
      });
    }
    const job = await cvAnalysisQueue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Job not found',
        },
      });
    }
    const state = await job.getState();
    const progress = job.progress as number;
    return res.json({
      data: {
        jobId: job.id,
        state,
        progress,
        result: state === 'completed' ? job.returnvalue : null,
        failedReason: state === 'failed' ? job.failedReason : null,
      },
    });
  } catch (error) {
    console.error('Get job status error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get job status',
      },
    });
  }
});
router.get('/user/list', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const analyses = await CVAnalysisService.listUserAnalyses(userId, limit);
    return res.status(200).json({
      data: analyses.map((a) => ({
        id: a.id,
        cvFileId: a.cvFileId,
        matchScore: a.matchScore,
        jobUrl: a.jobUrl,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('List analyses error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
router.get('/user/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await CVAnalysisService.getUserStats(userId);
    return res.status(200).json({
      data: stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const analysisId = req.params.id;
    await CVAnalysisService.deleteAnalysis(analysisId, userId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Analysis not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
      }
    }
    console.error('Delete analysis error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
export default router;
