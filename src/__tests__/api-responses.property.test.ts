/**
 * Property Tests for API Response Formatting
 * Tests Properties 52-57 and 49
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 12.6
 */

import fc from 'fast-check';
import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { UserModel } from '../models';
import { generateToken } from '../utils/jwt';

// Test helpers
const createTestUser = async (role: 'user' | 'admin' = 'user') => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  return UserModel.create(email, 'password123', role);
};



// Cleanup after each test
afterEach(async () => {
  await pool.query('DELETE FROM files');
  await pool.query('DELETE FROM applications');
  await pool.query('DELETE FROM audit_log');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

describe('API Response Format Property Tests', () => {
  /**
   * Property 52: Success responses formatted correctly
   * **Validates: Requirements 14.1**
   */
  test('Property 52: Success responses formatted correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          companyName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          position: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          status: fc.constantFrom('Applied', 'Interview', 'Offer', 'Rejected'),
          applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
        }),
        async (applicationData) => {
          const user = await createTestUser();
          const token = generateToken(user);

          const response = await request(app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...applicationData,
              applicationDate: applicationData.applicationDate.toISOString().split('T')[0]
            });

          // Success response should have 2xx status
          expect(response.status).toBeGreaterThanOrEqual(200);
          expect(response.status).toBeLessThan(300);

          // Success response should have data payload
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toBeDefined();

          // Should not have error property
          expect(response.body).not.toHaveProperty('error');
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * Property 53: Validation errors return 400
   * **Validates: Requirements 14.2**
   */
  test('Property 53: Validation errors return 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate invalid data by randomly omitting required fields
          companyName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          position: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          status: fc.option(fc.constantFrom('Applied', 'Interview', 'Offer', 'Rejected'), { nil: undefined }),
          applicationDate: fc.option(fc.constant(new Date().toISOString().split('T')[0]), { nil: undefined })
        }).filter(data => 
          // Ensure at least one required field is missing
          !data.companyName || !data.position || !data.status || !data.applicationDate
        ),
        async (invalidData) => {
          const user = await createTestUser();
          const token = generateToken(user);

          const response = await request(app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${token}`)
            .send(invalidData);

          // Validation error should return 400
          expect(response.status).toBe(400);

          // Should have error property with correct structure
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body.error.code).toBe('VALIDATION_ERROR');

          // Should not have data property
          expect(response.body).not.toHaveProperty('data');
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * Property 54: Authentication errors return 401
   * **Validates: Requirements 14.3**
   */
  test('Property 54: Authentication errors return 401', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          // Missing token
          undefined,
          // Invalid token format
          'invalid-token',
          // Malformed Bearer token
          'Bearer',
          // Token without Bearer prefix
          'some-random-token',
          // Expired/invalid JWT
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
        ),
        async (authHeader) => {
          const response = await request(app)
            .get('/api/applications')
            .set('Authorization', authHeader || '');

          // Authentication error should return 401
          expect(response.status).toBe(401);

          // Should have error property with correct structure
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');

          // Should not have data property
          expect(response.body).not.toHaveProperty('data');
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * Property 55: Authorization errors return 403
   * **Validates: Requirements 14.4**
   */
  test('Property 55: Authorization errors return 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Create a regular user (non-admin)
          const user = await createTestUser('user');
          const token = generateToken(user);

          // Try to access admin-only endpoints
          const adminEndpoints = [
            '/api/admin/users',
            '/api/admin/stats',
            '/api/admin/audit'
          ];

          for (const endpoint of adminEndpoints) {
            const response = await request(app)
              .get(endpoint)
              .set('Authorization', `Bearer ${token}`);

            // Authorization error should return 403
            expect(response.status).toBe(403);

            // Should have error property with correct structure
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code');
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.code).toBe('FORBIDDEN');

            // Should not have data property
            expect(response.body).not.toHaveProperty('data');
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * Property 56: Not found errors return 404
   * **Validates: Requirements 14.5**
   */
  test('Property 56: Not found errors return 404', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (nonExistentId) => {
          const user = await createTestUser();
          const token = generateToken(user);

          // Try to access non-existent application
          const response = await request(app)
            .get(`/api/applications/${nonExistentId}`)
            .set('Authorization', `Bearer ${token}`);

          // Not found error should return 404
          expect(response.status).toBe(404);

          // Should have error property with correct structure
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body.error.code).toBe('NOT_FOUND');

          // Should not have data property
          expect(response.body).not.toHaveProperty('data');
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * Property 57: Server errors return 500
   * **Validates: Requirements 14.6**
   * 
   * Note: This test simulates server errors by triggering database errors
   */
  test('Property 57: Server errors return 500', async () => {
    // Close the database pool to simulate server error
    const originalQuery = pool.query.bind(pool);
    
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const user = await createTestUser();
          const token = generateToken(user);

          // Temporarily break the database connection
          pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

          try {
            const response = await request(app)
              .get('/api/applications')
              .set('Authorization', `Bearer ${token}`);

            // Server error should return 500
            expect(response.status).toBe(500);

            // Should have error property with correct structure
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code');
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.code).toBe('SERVER_ERROR');

            // Should not have data property
            expect(response.body).not.toHaveProperty('data');
          } finally {
            // Restore the original query function
            pool.query = originalQuery;
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});
