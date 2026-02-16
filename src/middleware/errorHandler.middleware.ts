/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and returns consistent error responses
 * Requirements: 14.6
 */

import { Request, Response, NextFunction } from 'express';
import { createServerError } from '../utils/errorFormatter';

/**
 * Global error handler middleware
 * Must be registered after all routes
 * Requirements: 14.6
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error with stack trace for debugging
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Return generic server error response
  const errorResponse = createServerError('An unexpected error occurred');
  res.status(500).json(errorResponse);
}
