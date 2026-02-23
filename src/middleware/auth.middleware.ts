import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserModel } from '../models';
import { User } from '../types';
export interface AuthRequest extends Request {
  user?: User;
}
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
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
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }
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
