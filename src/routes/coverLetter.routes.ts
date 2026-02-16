/**
 * Cover Letter Routes
 * API endpoints for cover letter generation and management
 * Requirements: 13.1-13.4, 14.1-14.3, 15.1-15.3
 */

import { Router, Response } from 'express';
import { CoverLetterService } from '../services/coverLetter.service';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * POST /api/cover-letter/generate
 * Generate new cover letter
 * Requirements: 13.1-13.4
 */
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      cvFileId,
      applicationId,
      companyName,
      position,
      jobDescription,
      tone,
      language,
    } = req.body;

    // Validation
    if (!cvFileId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CV file ID is required',
        },
      });
    }

    if (!companyName || !position) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Company name and position are required',
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

    if (!['formal', 'casual', 'creative'].includes(tone)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tone must be one of: formal, casual, creative',
        },
      });
    }

    if (!['tr', 'en'].includes(language)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Language must be one of: tr, en',
        },
      });
    }

    // Generate cover letter
    const coverLetter = await CoverLetterService.generateCoverLetter({
      userId,
      cvFileId,
      applicationId,
      companyName: companyName.trim(),
      position: position.trim(),
      jobDescription: jobDescription.trim(),
      tone,
      language,
    });

    return res.status(201).json({
      data: {
        id: coverLetter.id,
        companyName: coverLetter.companyName,
        position: coverLetter.position,
        tone: coverLetter.tone,
        language: coverLetter.language,
        content: coverLetter.content,
        createdAt: coverLetter.createdAt,
      },
    });
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

      if (error.message.includes('not configured')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
    }

    console.error('Cover letter generation error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to generate cover letter. Please try again.',
      },
    });
  }
});

/**
 * GET /api/cover-letter/:id
 * Get cover letter by ID
 * Requirements: 14.1
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const coverLetterId = req.params.id;

    const coverLetter = await CoverLetterService.getCoverLetter(coverLetterId, userId);

    return res.status(200).json({
      data: {
        id: coverLetter.id,
        cvFileId: coverLetter.cvFileId,
        applicationId: coverLetter.applicationId,
        companyName: coverLetter.companyName,
        position: coverLetter.position,
        tone: coverLetter.tone,
        language: coverLetter.language,
        content: coverLetter.content,
        createdAt: coverLetter.createdAt,
        updatedAt: coverLetter.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Cover letter not found') {
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

    console.error('Get cover letter error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/cover-letter/user/list
 * List user's cover letters
 * Requirements: 14.1
 */
router.get('/user/list', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const coverLetters = await CoverLetterService.listUserCoverLetters(userId, limit);

    return res.status(200).json({
      data: coverLetters.map((cl) => ({
        id: cl.id,
        companyName: cl.companyName,
        position: cl.position,
        tone: cl.tone,
        language: cl.language,
        createdAt: cl.createdAt,
      })),
    });
  } catch (error) {
    console.error('List cover letters error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * PUT /api/cover-letter/:id
 * Update cover letter content
 * Requirements: 14.2
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const coverLetterId = req.params.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
        },
      });
    }

    const coverLetter = await CoverLetterService.updateCoverLetter(
      coverLetterId,
      userId,
      content.trim()
    );

    return res.status(200).json({
      data: {
        id: coverLetter.id,
        content: coverLetter.content,
        updatedAt: coverLetter.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Cover letter not found') {
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

    console.error('Update cover letter error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * DELETE /api/cover-letter/:id
 * Delete cover letter
 * Requirements: 14.1
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const coverLetterId = req.params.id;

    await CoverLetterService.deleteCoverLetter(coverLetterId, userId);

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Cover letter not found') {
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

    console.error('Delete cover letter error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

export default router;
