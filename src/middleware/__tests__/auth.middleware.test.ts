import { Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../auth.middleware';
import { UserModel } from '../../models';
import { User } from '../../types';

// Mock dependencies
jest.mock('../../utils/jwt');
jest.mock('../../models');

const mockVerifyToken = require('../../utils/jwt').verifyToken as jest.Mock;
const mockFindById = UserModel.findById as jest.MockedFunction<typeof UserModel.findById>;

describe('Auth Middleware - requireAuth', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup response mock
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  describe('Missing Authorization Header', () => {
    it('should return 401 when Authorization header is missing', async () => {
      mockRequest.headers = {};

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header is required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token Format', () => {
    it('should return 401 when Authorization header does not start with Bearer', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token123',
      };

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header has only Bearer without token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer',
      };

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header has extra parts', async () => {
      mockRequest.headers = {
        authorization: 'Bearer token123 extra',
      };

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 when token is expired', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      mockVerifyToken.mockImplementation(() => {
        throw new Error('Token has expired');
      });

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockVerifyToken).toHaveBeenCalledWith('expired-token');
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token has expired',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is malformed', async () => {
      mockRequest.headers = {
        authorization: 'Bearer malformed-token',
      };

      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockVerifyToken).toHaveBeenCalledWith('malformed-token');
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('User Not Found', () => {
    it('should return 401 when user associated with token does not exist', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockVerifyToken.mockReturnValue({
        userId: 'non-existent-user-id',
        email: 'test@example.com',
        role: 'user',
      });

      mockFindById.mockResolvedValue(null);

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockFindById).toHaveBeenCalledWith('non-existent-user-id');
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token no longer exists',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Valid Token', () => {
    it('should attach user to request and call next() when token is valid', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockVerifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      mockFindById.mockResolvedValue(mockUser);

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockFindById).toHaveBeenCalledWith('user-123');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should work with admin user', async () => {
      const mockAdminUser: User = {
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: 'hashed-password',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.headers = {
        authorization: 'Bearer admin-token',
      };

      mockVerifyToken.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      });

      mockFindById.mockResolvedValue(mockAdminUser);

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockVerifyToken).toHaveBeenCalledWith('admin-token');
      expect(mockFindById).toHaveBeenCalledWith('admin-123');
      expect(mockRequest.user).toEqual(mockAdminUser);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when an unexpected error occurs', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockVerifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      // Simulate database error
      mockFindById.mockRejectedValue(new Error('Database connection failed'));

      await requireAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during authentication',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
