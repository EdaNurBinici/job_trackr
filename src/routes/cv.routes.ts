/**
 * CV Routes
 * API endpoints for CV file management
 * Requirements: 1.1, 1.3, 2.1, 2.2
 */

import { Router, Response } from 'express';
import { IncomingForm } from 'formidable';
import { readFile } from 'fs/promises';
import { CVService } from '../services/cv.service';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// All CV routes require authentication
router.use(requireAuth);

/**
 * POST /api/cv/upload
 * Upload a CV file
 * Requirements: 1.1, 4.1
 */
router.post('/upload', (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;

    // Parse multipart form data
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowEmptyFiles: false,
    });

    form.parse(req, async (err, _fields, files) => {
      if (err) {
        return res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: 'Failed to parse upload',
          },
        });
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;

      if (!file) {
        return res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        });
      }

      try {
        // Read file buffer
        const buffer = await readFile(file.filepath);

        // Upload CV
        const result = await CVService.uploadCV(
          buffer,
          file.originalFilename || 'cv.pdf',
          userId,
          file.mimetype || 'application/pdf'
        );

        return res.status(201).json({
          data: {
            id: result.cvFile.id,
            fileName: result.cvFile.fileName,
            s3Key: result.cvFile.s3Key,
            signedUrl: result.signedUrl,
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('exceeds') || error.message.includes('not allowed')) {
            return res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: error.message,
              },
            });
          }
        }

        console.error('CV upload error:', error);
        return res.status(500).json({
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to upload CV',
          },
        });
      }
    });
  } catch (error) {
    console.error('CV upload error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/cv/:id
 * Get CV file with signed URL
 * Requirements: 1.3
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const cvId = req.params.id;

    const result = await CVService.getCV(cvId, userId);

    return res.status(200).json({
      data: {
        id: result.cvFile.id,
        fileName: result.cvFile.fileName,
        fileSize: result.cvFile.fileSize,
        mimeType: result.cvFile.mimeType,
        signedUrl: result.signedUrl,
        createdAt: result.cvFile.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CV file not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.message === 'Unauthorized access to CV file') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
      }
    }

    console.error('CV get error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/cv/user/list
 * List all CV files for the authenticated user
 * Requirements: 2.1
 */
router.get('/user/list', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const cvFiles = await CVService.listUserCVs(userId);

    return res.status(200).json({
      data: cvFiles.map(cv => ({
        id: cv.id,
        fileName: cv.fileName,
        fileSize: cv.fileSize,
        mimeType: cv.mimeType,
        createdAt: cv.createdAt,
      })),
    });
  } catch (error) {
    console.error('CV list error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/cv/user/:userId
 * List all CV files for a specific user
 * Requirements: 2.1
 * Authorization: User can only access their own CVs
 */
router.get('/user/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const requestingUserId = req.user!.id;
    const targetUserId = req.params.userId;

    // Authorization check: users can only access their own CVs
    if (requestingUserId !== targetUserId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only access your own CV files',
        },
      });
    }

    const cvFiles = await CVService.listUserCVs(targetUserId);

    return res.status(200).json({
      data: cvFiles.map(cv => ({
        id: cv.id,
        fileName: cv.fileName,
        fileSize: cv.fileSize,
        mimeType: cv.mimeType,
        createdAt: cv.createdAt,
      })),
    });
  } catch (error) {
    console.error('CV list error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * DELETE /api/cv/:id
 * Delete a CV file
 * Requirements: 2.2, 3.2
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const cvId = req.params.id;

    await CVService.deleteCV(cvId, userId);

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CV file not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.message === 'Unauthorized access to CV file') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        });
      }
    }

    console.error('CV delete error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

export default router;
