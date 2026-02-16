import request from 'supertest';
import express, { Application } from 'express';
import { requireAuth, AuthRequest } from '../auth.middleware';
import { pool } from '../../config/database';
import { UserModel } from '../../models';
import { generateToken } from '../../utils/jwt';

// Create a test app with protected route
const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());

  // Protected route that requires authentication
  app.get('/api/protected', requireAuth, (req: AuthRequest, res) => {
    res.json({
      message: 'Access granted',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
      },
    });
  });

  return app;
};

describe('Auth Middleware - Integration Tests', () => {
  let app: Application;
  let testUserId: string;
  let testUserToken: string;
  let adminUserId: string;
  let adminUserToken: string;

  beforeAll(async () => {
    app = createTestApp();

    // Clean up users table
    await pool.query('DELETE FROM users');

    // Create test user
    const testUser = await UserModel.create('test@example.com', 'password123', 'user');
    testUserId = testUser.id;
    testUserToken = generateToken(testUser);

    // Create admin user
    const adminUser = await UserModel.create('admin@example.com', 'password123', 'admin');
    adminUserId = adminUser.id;
    adminUserToken = generateToken(adminUser);
  });

  afterAll(async () => {
    // Clean up - don't close the pool as other tests may need it
    await pool.query('DELETE FROM users');
  });

  describe('Valid Authentication', () => {
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Access granted');
      expect(response.body.user.id).toBe(testUserId);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe('user');
    });

    it('should allow access for admin user with valid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${adminUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Access granted');
      expect(response.body.user.id).toBe(adminUserId);
      expect(response.body.user.email).toBe('admin@example.com');
      expect(response.body.user.role).toBe('admin');
    });
  });

  describe('Missing Authorization Header', () => {
    it('should reject request without Authorization header', async () => {
      const response = await request(app).get('/api/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
      expect(response.body.error.message).toBe('Authorization header is required');
    });
  });

  describe('Invalid Token Format', () => {
    it('should reject request with invalid Authorization format', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN_FORMAT');
    });

    it('should reject request with Bearer but no token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN_FORMAT');
    });
  });

  describe('Invalid Token', () => {
    it('should reject request with malformed token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject request with expired token', async () => {
      // Create a token that expires in 1 second
      const expiredUser = await UserModel.create('expired@example.com', 'password123');
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        {
          userId: expiredUser.id,
          email: expiredUser.email,
          role: expiredUser.role,
        },
        process.env.JWT_SECRET || 'default-secret-key',
        { expiresIn: '1ms' } // Expires in 1 millisecond
      );

      // Wait to ensure token is expired
      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
      expect(response.body.error.message).toMatch(/expired|invalid/i);
    });
  });

  describe('User Not Found', () => {
    it('should reject request when user associated with token no longer exists', async () => {
      // Create a user, get token, then delete the user
      const tempUser = await UserModel.create('temp@example.com', 'password123');
      const tempToken = generateToken(tempUser);

      // Delete the user
      await UserModel.delete(tempUser.id);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
      expect(response.body.error.message).toBe('User associated with token no longer exists');
    });
  });
});
