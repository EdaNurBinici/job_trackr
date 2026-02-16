import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserModel } from '../models';
import { User } from '../types';

/**
 * Extended Express Request interface that includes authenticated user
 * 
 * Usage:
 * ```typescript
 * import { requireAuth, AuthRequest } from './middleware';
 * 
 * app.get('/api/protected', requireAuth, (req: AuthRequest, res) => {
 *   const userId = req.user?.id;
 *   // ... use authenticated user
 * });
 * ```
 */
export interface AuthRequest extends Request {
  user?: User;
}

/**
 * Middleware to verify JWT token and attach user to request
 * Validates: Requirements 1.5, 1.6
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header is required',
        },
      });
      return;
    }

    // Check if header follows "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>',
        },
      });
      return;
    }

    const token = parts[1];

    // Verify token
    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: error instanceof Error ? error.message : 'Token verification failed',
        },
      });
      return;
    }

    // Fetch user from database to ensure they still exist
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token no longer exists',
        },
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred during authentication',
      },
    });
  }
}

/**
 * Middleware to verify user has admin role
 * Must be used after requireAuth middleware
 * Validates: Requirements 13.3, 13.4
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Check if user is attached (requireAuth should be called first)
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
    return;
  }

  next();
}
