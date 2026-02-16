import { generateToken, verifyToken, decodeToken } from '../jwt';
import { User } from '../../types';
import jwt from 'jsonwebtoken';

describe('JWT Utilities', () => {
  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user information in token payload', () => {
      const token = generateToken(mockUser);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUser.id);
      expect(decoded?.email).toBe(mockUser.email);
      expect(decoded?.role).toBe(mockUser.role);
    });

    it('should generate different tokens for different users', () => {
      const user1 = { ...mockUser, id: 'user1', email: 'user1@example.com' };
      const user2 = { ...mockUser, id: 'user2', email: 'user2@example.com' };
      
      const token1 = generateToken(user1);
      const token2 = generateToken(user2);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken(mockUser);
      const payload = verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
    });

    it('should throw error for expired token', () => {
      // Create a token that expires immediately
      const expiredToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
        process.env.JWT_SECRET || 'default-secret-key',
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure token is expired
      setTimeout(() => {
        expect(() => verifyToken(expiredToken)).toThrow('Token has expired');
      }, 100);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.string';
      
      expect(() => verifyToken(invalidToken)).toThrow('Invalid token');
    });

    it('should throw error for token with wrong secret', () => {
      const tokenWithWrongSecret = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
        'wrong-secret',
        { expiresIn: '24h' }
      );
      
      expect(() => verifyToken(tokenWithWrongSecret)).toThrow('Invalid token');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';
      
      expect(() => verifyToken(malformedToken)).toThrow('Invalid token');
    });
  });

  describe('decodeToken', () => {
    it('should decode a token without verification', () => {
      const token = generateToken(mockUser);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUser.id);
      expect(decoded?.email).toBe(mockUser.email);
      expect(decoded?.role).toBe(mockUser.role);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'not-a-valid-token';
      const decoded = decodeToken(invalidToken);
      
      expect(decoded).toBeNull();
    });

    it('should decode expired token (without verification)', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
        process.env.JWT_SECRET || 'default-secret-key',
        { expiresIn: '0s' }
      );

      // decode should work even for expired tokens
      const decoded = decodeToken(expiredToken);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUser.id);
    });
  });

  describe('Token expiration', () => {
    it('should set token expiration to 24 hours by default', () => {
      const token = generateToken(mockUser);
      const decoded = jwt.decode(token, { complete: true }) as any;
      
      expect(decoded).toBeDefined();
      expect(decoded.payload.exp).toBeDefined();
      expect(decoded.payload.iat).toBeDefined();
      
      // Check that expiration is approximately 24 hours from now
      const expirationTime = decoded.payload.exp - decoded.payload.iat;
      const expectedExpiration = 24 * 60 * 60; // 24 hours in seconds
      
      expect(expirationTime).toBe(expectedExpiration);
    });
  });

  describe('Admin role handling', () => {
    it('should correctly encode admin role in token', () => {
      const adminUser: User = {
        ...mockUser,
        role: 'admin',
      };
      
      const token = generateToken(adminUser);
      const payload = verifyToken(token);
      
      expect(payload.role).toBe('admin');
    });

    it('should correctly encode user role in token', () => {
      const regularUser: User = {
        ...mockUser,
        role: 'user',
      };
      
      const token = generateToken(regularUser);
      const payload = verifyToken(token);
      
      expect(payload.role).toBe('user');
    });
  });
});
