import fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../auth.middleware';
import { pool } from '../../config/database';
import { UserModel } from '../../models';
import { generateToken } from '../../utils/jwt';

/**
 * Property-Based Tests for Authorization
 * Feature: job-trackr
 */

// Counter for generating unique emails
let emailCounter = 0;

// Create a test app with admin-protected routes
const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());

  // Admin-only routes that require both authentication and admin role
  app.get('/api/admin/users', requireAuth, requireAdmin, (_req: AuthRequest, res) => {
    res.json({
      message: 'User list access granted',
      users: [],
    });
  });

  app.get('/api/admin/stats', requireAuth, requireAdmin, (_req: AuthRequest, res) => {
    res.json({
      message: 'System stats access granted',
      stats: {},
    });
  });

  app.get('/api/admin/audit', requireAuth, requireAdmin, (_req: AuthRequest, res) => {
    res.json({
      message: 'Audit log access granted',
      logs: [],
    });
  });

  return app;
};

describe('Authorization - Property-Based Tests', () => {
  let app: Application;
  const createdUserIds: string[] = [];

  beforeAll(() => {
    app = createTestApp();
  });

  // Clean up test data after all tests
  afterAll(async () => {
    // Delete all created users
    if (createdUserIds.length > 0) {
      await pool.query(
        `DELETE FROM users WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
    }
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@auth-pbt-test.com']);
    // Don't close the pool as other tests may need it
  });

  /**
   * Property 36: Non-admin authorization blocked
   * **Validates: Requirements 9.2, 10.5, 11.5, 13.4**
   * 
   * For any non-admin user attempting to access admin-only endpoints
   * (user list, system stats, audit log), the request should be rejected
   * with a 403 authorization error.
   */
  test(
    'Property 36: Non-admin authorization blocked',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid email addresses with unique counter
          fc.record({
            localPart: fc.stringMatching(/^[a-z0-9]{1,20}$/),
            random: fc.integer({ min: 0, max: 999999 }),
          }).map(({ localPart, random }) => 
            `${localPart}-${++emailCounter}-${random}@auth-pbt-test.com`
          ),
          // Generate valid passwords
          fc.string({ minLength: 8, maxLength: 50 }),
          // Generate admin-only endpoints
          fc.constantFrom(
            '/api/admin/users',
            '/api/admin/stats',
            '/api/admin/audit'
          ),
          async (email, password, endpoint) => {
            // Create a regular (non-admin) user
            const user = await UserModel.create(email, password, 'user');
            expect(user).toBeDefined();
            expect(user.role).toBe('user');
            
            // Track user for cleanup
            createdUserIds.push(user.id);

            // Generate a valid JWT token for the regular user
            const token = generateToken(user);
            expect(token).toBeDefined();

            // Attempt to access admin-only endpoint with regular user token
            const response = await request(app)
              .get(endpoint)
              .set('Authorization', `Bearer ${token}`);

            // Verify the request is rejected with 403 Forbidden
            expect(response.status).toBe(403);
            expect(response.body.error).toBeDefined();
            expect(response.body.error.code).toBe('FORBIDDEN');
            expect(response.body.error.message).toBe('Admin access required');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000 // 60 second timeout for property-based test with 100 runs
  );

  /**
   * Property 51: Admin endpoints require admin role
   * **Validates: Requirements 13.3**
   * 
   * For any admin user with admin role, they should be able to successfully
   * access admin-only endpoints.
   */
  test(
    'Property 51: Admin endpoints require admin role',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid email addresses with unique counter
          fc.record({
            localPart: fc.stringMatching(/^[a-z0-9]{1,20}$/),
            random: fc.integer({ min: 0, max: 999999 }),
          }).map(({ localPart, random }) => 
            `${localPart}-${++emailCounter}-${random}@auth-pbt-test.com`
          ),
          // Generate valid passwords
          fc.string({ minLength: 8, maxLength: 50 }),
          // Generate admin-only endpoints
          fc.constantFrom(
            '/api/admin/users',
            '/api/admin/stats',
            '/api/admin/audit'
          ),
          async (email, password, endpoint) => {
            // Create an admin user
            const adminUser = await UserModel.create(email, password, 'admin');
            expect(adminUser).toBeDefined();
            expect(adminUser.role).toBe('admin');
            
            // Track user for cleanup
            createdUserIds.push(adminUser.id);

            // Generate a valid JWT token for the admin user
            const token = generateToken(adminUser);
            expect(token).toBeDefined();

            // Attempt to access admin-only endpoint with admin user token
            const response = await request(app)
              .get(endpoint)
              .set('Authorization', `Bearer ${token}`);

            // Verify the request is successful (200 OK)
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            
            // Verify the response contains expected data structure
            // Each endpoint should return a message and data
            expect(response.body.message).toBeDefined();
            expect(typeof response.body.message).toBe('string');
            expect(response.body.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000 // 60 second timeout
  );

  /**
   * Additional test: Verify authorization without authentication is rejected
   * This ensures the middleware chain works correctly (requireAuth before requireAdmin)
   */
  test(
    'Property 36 (No Auth): Admin endpoints reject unauthenticated requests',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate admin-only endpoints
          fc.constantFrom(
            '/api/admin/users',
            '/api/admin/stats',
            '/api/admin/audit'
          ),
          async (endpoint) => {
            // Attempt to access admin-only endpoint without authentication
            const response = await request(app).get(endpoint);

            // Verify the request is rejected with 401 Unauthorized
            expect(response.status).toBe(401);
            expect(response.body.error).toBeDefined();
            expect(response.body.error.code).toBe('MISSING_TOKEN');
            expect(response.body.error.message).toBe('Authorization header is required');
          }
        ),
        { numRuns: 100 }
      );
    },
    30000 // 30 second timeout
  );

  /**
   * Additional test: Verify authorization with invalid token is rejected
   * This ensures token validation happens before role checking
   */
  test(
    'Property 36 (Invalid Token): Admin endpoints reject invalid tokens',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate admin-only endpoints
          fc.constantFrom(
            '/api/admin/users',
            '/api/admin/stats',
            '/api/admin/audit'
          ),
          // Generate various types of invalid tokens
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes('.')),
            fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.${s}`),
            fc.constantFrom('invalid-token', 'malformed', '12345')
          ),
          async (endpoint, invalidToken) => {
            // Attempt to access admin-only endpoint with invalid token
            const response = await request(app)
              .get(endpoint)
              .set('Authorization', `Bearer ${invalidToken}`);

            // Verify the request is rejected with 401 Unauthorized
            expect(response.status).toBe(401);
            expect(response.body.error).toBeDefined();
            // Token can be rejected for format or verification issues
            expect(['INVALID_TOKEN', 'INVALID_TOKEN_FORMAT']).toContain(response.body.error.code);
          }
        ),
        { numRuns: 100 }
      );
    },
    30000 // 30 second timeout
  );
});
