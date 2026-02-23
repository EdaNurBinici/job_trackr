import { Router, Response } from 'express';
import { FileService } from '../services';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { ApplicationService } from '../services';
import formidable from 'formidable';
import * as fs from 'fs';
const router = Router();
router.use(requireAuth);
router.post('/applications/:id/files', (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const applicationId = req.params.id;
  ApplicationService.getById(userId, applicationId)
    .then(() => {
      const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB
        keepExtensions: true,
      });
      form.parse(req, async (err, _fields, files) => {
        if (err) {
          res.status(400).json({
            error: {
              code: 'UPLOAD_ERROR',
              message: 'Failed to parse file upload',
            },
          });
          return;
        }
        const fileArray = files.file;
        if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No file provided',
            },
          });
          return;
        }
        const uploadedFile = Array.isArray(fileArray) ? fileArray[0] : fileArray;
        const fileBuffer = fs.readFileSync(uploadedFile.filepath);
        const file = {
          buffer: fileBuffer,
          originalName: uploadedFile.originalFilename || 'unknown.pdf',
          mimeType: uploadedFile.mimetype || 'application/octet-stream',
          size: uploadedFile.size,
        };
        try {
          const fileMetadata = await FileService.upload(userId, applicationId, file);
          fs.unlinkSync(uploadedFile.filepath);
          res.status(201).json({
            data: fileMetadata,
          });
        } catch (error) {
          try {
            fs.unlinkSync(uploadedFile.filepath);
          } catch (cleanupError) {
          }
          if (error instanceof Error) {
            if (
              error.message.includes('Invalid file type') ||
              error.message.includes('File size exceeds')
            ) {
              res.status(400).json({
                error: {
                  code: 'VALIDATION_ERROR',
                  message: error.message,
                },
              });
              return;
            }
          }
          console.error('File upload error:', error);
          res.status(500).json({
            error: {
              code: 'SERVER_ERROR',
              message: 'An unexpected error occurred',
            },
          });
        }
      });
    })
    .catch(() => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found',
        },
      });
    });
});
router.get('/files/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const fileId = req.params.id;
    const { url, fileName } = await FileService.download(userId, fileId);
    res.status(200).json({
      data: {
        url,
        fileName,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
    }
    console.error('File download error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
router.delete('/files/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const fileId = req.params.id;
    await FileService.delete(userId, fileId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'File not found') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }
    }
    console.error('File delete error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
router.get('/applications/:id/files', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const applicationId = req.params.id;
    try {
      await ApplicationService.getById(userId, applicationId);
    } catch (error) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found',
        },
      });
      return;
    }
    const files = await FileService.getByApplication(applicationId);
    res.status(200).json({
      data: files,
    });
  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
export default router;
