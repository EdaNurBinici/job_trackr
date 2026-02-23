export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
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
export function getStatusCodeForErrorType(errorType: ErrorType): number {
  switch (errorType) {
    case ErrorType.VALIDATION_ERROR:
    case ErrorType.DUPLICATE_EMAIL:
      return 400;
    case ErrorType.INVALID_CREDENTIALS:
    case ErrorType.MISSING_TOKEN:
    case ErrorType.INVALID_TOKEN_FORMAT:
    case ErrorType.INVALID_TOKEN:
    case ErrorType.USER_NOT_FOUND:
    case ErrorType.UNAUTHORIZED:
      return 401;
    case ErrorType.FORBIDDEN:
      return 403;
    case ErrorType.NOT_FOUND:
      return 404;
    case ErrorType.SERVER_ERROR:
    case ErrorType.INTERNAL_ERROR:
    default:
      return 500;
  }
}
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
export function createValidationError(
  message: string,
  details?: Record<string, string>
): ErrorResponse {
  return formatErrorResponse(ErrorType.VALIDATION_ERROR, message, details);
}
export function createAuthenticationError(
  code: ErrorType,
  message: string
): ErrorResponse {
  return formatErrorResponse(code, message);
}
export function createAuthorizationError(message: string): ErrorResponse {
  return formatErrorResponse(ErrorType.FORBIDDEN, message);
}
export function createNotFoundError(message: string): ErrorResponse {
  return formatErrorResponse(ErrorType.NOT_FOUND, message);
}
export function createServerError(message: string = 'An unexpected error occurred'): ErrorResponse {
  return formatErrorResponse(ErrorType.SERVER_ERROR, message);
}
