/**
 * Error Response Formatter
 * Provides consistent error response structure across all API endpoints
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Error types mapped to HTTP status codes
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN_FORMAT = 'INVALID_TOKEN_FORMAT',
  INVALID_TOKEN = 'INVALID_TOKEN',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Map error types to HTTP status codes
 * Requirements: 14.2, 14.3, 14.4, 14.5, 14.6
 */
export function getStatusCodeForErrorType(errorType: ErrorType): number {
  switch (errorType) {
    // 400 - Validation errors
    case ErrorType.VALIDATION_ERROR:
    case ErrorType.DUPLICATE_EMAIL:
      return 400;

    // 401 - Authentication errors
    case ErrorType.INVALID_CREDENTIALS:
    case ErrorType.MISSING_TOKEN:
    case ErrorType.INVALID_TOKEN_FORMAT:
    case ErrorType.INVALID_TOKEN:
    case ErrorType.USER_NOT_FOUND:
    case ErrorType.UNAUTHORIZED:
      return 401;

    // 403 - Authorization errors
    case ErrorType.FORBIDDEN:
      return 403;

    // 404 - Not found errors
    case ErrorType.NOT_FOUND:
      return 404;

    // 500 - Server errors
    case ErrorType.SERVER_ERROR:
    case ErrorType.INTERNAL_ERROR:
    default:
      return 500;
  }
}

/**
 * Format error response with consistent structure
 * Requirements: 14.1
 */
export function formatErrorResponse(
  code: string,
  message: string,
  details?: any
): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    response.error.details = details;
  }

  return response;
}

/**
 * Create a validation error response
 * Requirements: 14.2, 12.6
 */
export function createValidationError(
  message: string,
  details?: Record<string, string>
): ErrorResponse {
  return formatErrorResponse(ErrorType.VALIDATION_ERROR, message, details);
}

/**
 * Create an authentication error response
 * Requirements: 14.3
 */
export function createAuthenticationError(
  code: ErrorType,
  message: string
): ErrorResponse {
  return formatErrorResponse(code, message);
}

/**
 * Create an authorization error response
 * Requirements: 14.4
 */
export function createAuthorizationError(message: string): ErrorResponse {
  return formatErrorResponse(ErrorType.FORBIDDEN, message);
}

/**
 * Create a not found error response
 * Requirements: 14.5
 */
export function createNotFoundError(message: string): ErrorResponse {
  return formatErrorResponse(ErrorType.NOT_FOUND, message);
}

/**
 * Create a server error response
 * Requirements: 14.6
 */
export function createServerError(message: string = 'An unexpected error occurred'): ErrorResponse {
  return formatErrorResponse(ErrorType.SERVER_ERROR, message);
}
