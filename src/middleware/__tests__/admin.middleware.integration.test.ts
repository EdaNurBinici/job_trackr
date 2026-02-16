import request from 'supertest';
import express, { Application } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../auth.middleware';
import { pool } from '../../config/database';
import { UserModel } from '../../models';
import { generateToken } from '../../utils/jwt';

// Create a test app with admin-protected route
const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());

  // Admin-only route that requires both authentication and admin role
  app.get('/api/admin/stats', requireAuth, requireAdmin, (req: AuthRequest, res) => {
    res.json({
      message: 'Admin access granted',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
      },
    });
  });

  return app;
};

describe('Admin Middleware - Integration Tests', () => {
  let app: Application;
  let regularUserToken: string;
  let adminUserId: string;
  let adminUserToken: string;

  beforeAll(async () => {
    app = createTestApp();

    // Clean up users table
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [
      'admin-test@example.com',
      'regular-test@example.com',
    ]);

    // Create regular user
    const regularUser = await UserModel.create('regular-test@example.com', 'password123', 'user');
    regularUserToken = generateToken(regularUser);

    // Create admin user
    const adminUser = await UserModel.create('admin-test@example.com', 'password123', 'admin');
    adminUserId = adminUser.id;
    adminUserToken = generateToken(adminUser);
  });

  afterAll(async () => {
    // Clean up - don't close the pool as other tests may need it
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [
      'admin-test@example.com',
      'regular-test@example.com',
    ]);
  });

  describe('Admin Access - Requirements 13.3, 13.4', () => {
    it('should allow access for admin user', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin access granted');
      expect(response.body.user.id).toBe(adminUserId);
      expect(response.body.user.email).toBe('admin-test@example.com');
      expect(response.body.user.role).toBe('admin');
    });

    it('should reject access for regular user with 403 Forbidden', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Admin access required');
    });

    it('should reject access without authentication', async () => {
      const response = await request(app).get('/api/admin/stats');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
