import { Request, Response, NextFunction } from 'express';
import { createServerError } from '../utils/errorFormatter';
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  if (res.headersSent) {
    return next(err);
  }
  const errorResponse = createServerError('An unexpected error occurred');
  res.status(500).json(errorResponse);
}
