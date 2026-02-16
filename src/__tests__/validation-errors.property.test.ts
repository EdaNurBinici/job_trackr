/**
 * Property Tests for Validation Error Messages
 * Tests Property 49
 * Requirements: 12.6
 */

import fc from 'fast-check';
import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';
import { UserModel } from '../models';
import { generateToken } from '../utils/jwt';

// Test helpers
const createTestUser = async () => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  return UserModel.create(email, 'password123', 'user');
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

describe('Validation Error Messages Property Tests', () => {
  /**
   * Property 49: Validation errors descriptive
   * **Validates: Requirements 12.6**
   */
  test('Property 49: Validation errors descriptive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Test various validation scenarios
          scenario: fc.constantFrom(
            'missing_email',
            'missing_password',
            'invalid_email',
            'short_password',
            'missing_company',
            'missing_position',
            'missing_status',
            'missing_date',
            'invalid_status'
          )
        }),
        async ({ scenario }) => {
          let response;
          let expectedField: string;

          switch (scenario) {
            case 'missing_email':
              // Test registration with missing email
              response = await request(app)
                .post('/api/auth/register')
                .send({ password: 'password123' });
              expectedField = 'email';
              break;

            case 'missing_password':
              // Test registration with missing password
              response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com' });
              expectedField = 'password';
              break;

            case 'invalid_email':
              // Test registration with invalid email format
              response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'not-an-email', password: 'password123' });
              expectedField = 'email';
              break;

            case 'short_password':
              // Test registration with short password
              response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com', password: 'short' });
              expectedField = 'password';
              break;

            case 'missing_company':
              // Test application creation with missing company
              {
                const user = await createTestUser();
                const token = generateToken(user);
                response = await request(app)
                  .post('/api/applications')
                  .set('Authorization', `Bearer ${token}`)
                  .send({
                    position: 'Developer',
                    status: 'Applied',
                    applicationDate: '2024-01-01'
                  });
                expectedField = 'company';
              }
              break;

            case 'missing_position':
              // Test application creation with missing position
              {
                const user = await createTestUser();
                const token = generateToken(user);
                response = await request(app)
                  .post('/api/applications')
                  .set('Authorization', `Bearer ${token}`)
                  .send({
                    companyName: 'Test Corp',
                    status: 'Applied',
                    applicationDate: '2024-01-01'
                  });
                expectedField = 'position';
              }
              break;

            case 'missing_status':
              // Test application creation with missing status
              {
                const user = await createTestUser();
                const token = generateToken(user);
                response = await request(app)
                  .post('/api/applications')
                  .set('Authorization', `Bearer ${token}`)
                  .send({
                    companyName: 'Test Corp',
                    position: 'Developer',
                    applicationDate: '2024-01-01'
                  });
                expectedField = 'status';
              }
              break;

            case 'missing_date':
              // Test application creation with missing date
              {
                const user = await createTestUser();
                const token = generateToken(user);
                response = await request(app)
                  .post('/api/applications')
                  .set('Authorization', `Bearer ${token}`)
                  .send({
                    companyName: 'Test Corp',
                    position: 'Developer',
                    status: 'Applied'
                  });
                expectedField = 'date';
              }
              break;

            case 'invalid_status':
              // Test application creation with invalid status
              {
                const user = await createTestUser();
                const token = generateToken(user);
                response = await request(app)
                  .post('/api/applications')
                  .set('Authorization', `Bearer ${token}`)
                  .send({
                    companyName: 'Test Corp',
                    position: 'Developer',
                    status: 'InvalidStatus',
                    applicationDate: '2024-01-01'
                  });
                expectedField = 'status';
              }
              break;

            default:
              throw new Error(`Unknown scenario: ${scenario}`);
          }

          // Validation error should return 400
          expect(response.status).toBe(400);

          // Should have error property
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');

          // Error message should be descriptive and mention the field
          const errorMessage = response.body.error.message.toLowerCase();
          const errorDetails = response.body.error.details;

          // The error should indicate which field failed validation
          // Either in the message or in the details object
          const isDescriptive = 
            errorMessage.includes(expectedField.toLowerCase()) ||
            (errorDetails && Object.keys(errorDetails).some(key => 
              key.toLowerCase().includes(expectedField.toLowerCase())
            ));

          expect(isDescriptive).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Additional test: Multiple validation errors should list all failing fields
   */
  test('Multiple validation errors should list all failing fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Test registration with both email and password missing
          const response = await request(app)
            .post('/api/auth/register')
            .send({});

          // Should return 400
          expect(response.status).toBe(400);

          // Should have error with details
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('details');

          // Details should mention both email and password
          const details = response.body.error.details;
          expect(details).toHaveProperty('email');
          expect(details).toHaveProperty('password');
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * Additional test: Validation errors should not expose sensitive information
   */
  test('Validation errors should not expose sensitive information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.string({ minLength: 1, maxLength: 50 }),
          password: fc.string({ minLength: 1, maxLength: 50 })
        }),
        async (credentials) => {
          // Test login with invalid credentials
          const response = await request(app)
            .post('/api/auth/login')
            .send(credentials);

          // Should return 401 for invalid credentials
          if (response.status === 401) {
            // Error message should not reveal whether email exists or password is wrong
            const errorMessage = response.body.error.message.toLowerCase();
            
            // Should use generic message
            expect(
              errorMessage.includes('invalid') || 
              errorMessage.includes('credentials')
            ).toBe(true);

            // Should NOT reveal specific details like "email not found" or "wrong password"
            expect(errorMessage).not.toContain('email not found');
            expect(errorMessage).not.toContain('wrong password');
            expect(errorMessage).not.toContain('user does not exist');
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});
