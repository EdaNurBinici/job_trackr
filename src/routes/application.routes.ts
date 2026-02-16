import { Router, Response, Request } from 'express';
import { ApplicationService } from '../services';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { CreateApplicationDTO, UpdateApplicationDTO, ApplicationStatus } from '../types';
import { reminderJob } from '../jobs/reminderJob';

const router = Router();

/**
 * POST /api/applications/test-reminder
 * Test reminder job manually (development only - no auth required)
 */
router.post('/test-reminder', async (_req: Request, res: Response) => {
  try {
    console.log('Manual reminder job triggered...');
    const count = await reminderJob.runManually();
    return res.status(200).json({
      message: `Reminder job executed. Processed ${count} reminders.`,
      count
    });
  } catch (error) {
    console.error('Test reminder error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to run reminder job',
      },
    });
  }
});

// All application routes require authentication
router.use(requireAuth);

/**
 * POST /api/applications/quick-add
 * Quick add application from Chrome Extension
 * Requirements: 8.1-8.5
 */
router.post('/quick-add', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { companyName, position, location, jobUrl, source } = req.body;

    // Validation
    if (!companyName || !position) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Company name and position are required',
        },
      });
    }

    // Create application with default status
    const data: CreateApplicationDTO = {
      companyName: companyName.trim(),
      position: position.trim(),
      status: 'Applied' as ApplicationStatus,
      applicationDate: new Date().toISOString().split('T')[0], // Today's date
      location: location?.trim() || undefined,
      notes: source ? `Added via Chrome Extension from ${source}` : 'Added via Chrome Extension',
      sourceLink: jobUrl?.trim() || undefined,
    };

    const application = await ApplicationService.create(userId, data);

    return res.status(201).json({
      data: application,
    });
  } catch (error) {
    console.error('Quick-add error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to add application',
      },
    });
  }
});

/**
 * POST /api/applications
 * Create a new application
 * Requirements: 2.1
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data: CreateApplicationDTO = req.body;

    const application = await ApplicationService.create(userId, data);

    return res.status(201).json({
      data: application,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle validation errors
      if (
        error.message.includes('required') ||
        error.message.includes('Invalid') ||
        error.message.includes('cannot be empty')
      ) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
    }

    // Generic server error
    console.error('Application creation error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/applications
 * Get all applications for the authenticated user with optional filters
 * Requirements: 2.5, 6.2, 6.3, 6.4, 6.5, 6.6
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Parse query parameters
    const filters = {
      search: req.query.search as string | undefined,
      status: req.query.status as ApplicationStatus | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };

    const result = await ApplicationService.getAll(userId, filters);

    // result already contains {data, total, page, pageSize, totalPages}
    // so we wrap it in data to match our API format
    return res.status(200).json({
      data: result.data, // Only return the data array
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle validation errors
      if (error.message.includes('Invalid')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
    }

    // Generic server error
    console.error('Application list error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/applications/:id
 * Get a specific application by ID
 * Requirements: 2.5, 7.1
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const applicationId = req.params.id;

    const application = await ApplicationService.getById(userId, applicationId);

    return res.status(200).json({
      data: application,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle not found error
      if (error.message === 'Application not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
    }

    // Generic server error
    console.error('Application get error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * PUT /api/applications/:id
 * Update an application
 * Requirements: 2.3
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const applicationId = req.params.id;
    const data: UpdateApplicationDTO = req.body;

    const application = await ApplicationService.update(userId, applicationId, data);

    return res.status(200).json({
      data: application,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle not found error
      if (error.message === 'Application not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }

      // Handle validation errors
      if (
        error.message.includes('Invalid') ||
        error.message.includes('cannot be empty')
      ) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
    }

    // Generic server error
    console.error('Application update error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * DELETE /api/applications/:id
 * Delete an application
 * Requirements: 2.4
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const applicationId = req.params.id;

    await ApplicationService.delete(userId, applicationId);

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      // Handle not found error
      if (error.message === 'Application not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
    }

    // Generic server error
    console.error('Application delete error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * PATCH /api/applications/:id/status
 * Update application status only
 * Requirements: 3.1
 */
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const applicationId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status is required',
        },
      });
    }

    const application = await ApplicationService.updateStatus(userId, applicationId, status);

    return res.status(200).json({
      data: application,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle not found error
      if (error.message === 'Application not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }

      // Handle validation errors
      if (error.message.includes('Invalid status')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
    }

    // Generic server error
    console.error('Application status update error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

export default router;
