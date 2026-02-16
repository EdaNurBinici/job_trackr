import { Router, Response } from 'express';
import { AuditService, DashboardService } from '../services';
import { UserModel } from '../models';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { AuditAction } from '../types';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Get all users in the system (admin only)
 * Requirements: 9.1, 9.2
 */
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await UserModel.findAll();

    // Return only email and registration date (createdAt) for each user
    const userList = users.map(user => ({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      role: user.role,
    }));

    return res.status(200).json({
      data: userList,
    });
  } catch (error) {
    console.error('User list retrieval error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/admin/audit
 * Get audit logs with optional filters (admin only)
 * Requirements: 11.4, 11.5
 */
router.get('/audit', async (req: AuthRequest, res: Response) => {
  try {
    // Parse query parameters
    const filters = {
      userId: req.query.userId as string | undefined,
      entity: req.query.entity as string | undefined,
      entityId: req.query.entityId as string | undefined,
      action: req.query.action as AuditAction | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };

    const result = await AuditService.getAuditLog(filters);

    return res.status(200).json({
      data: result.data,
    });
  } catch (error) {
    // Generic server error
    console.error('Audit log retrieval error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/admin/stats
 * Get system-wide statistics (admin only)
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await DashboardService.getSystemStats();

    return res.status(200).json({
      data: stats,
    });
  } catch (error) {
    console.error('System stats retrieval error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

export default router;
