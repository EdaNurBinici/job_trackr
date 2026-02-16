import fc from 'fast-check';
import request from 'supertest';
import app from '../../index';
import { UserModel, ApplicationModel } from '../../models';
import { pool } from '../../config/database';
import { generateToken } from '../../utils/jwt';
import { CreateApplicationDTO, ApplicationStatus } from '../../types';

/**
 * Property-Based Tests for Application Authorization
 * Feature: job-trackr
 */

describe('Application Authorization - Property-Based Tests', () => {
  let testUser1Id: string;
  let testUser2Id: string;
  let testUser1Email: string;
  let testUser2Email: string;
  let user1Token: string;
  let user2Token: string;

  beforeAll(async () => {
    // Create two test users for cross-user access testing
    const timestamp = Date.now();
    testUser1Email = `auth-pbt-user1-${timestamp}@pbt-test.com`;
    testUser2Email = `auth-pbt-user2-${timestamp}@pbt-test.com`;
    
    const user1 = await UserModel.create(testUser1Email, 'password123');
    const user2 = await UserModel.create(testUser2Email, 'password123');
    testUser1Id = user1.id;
    testUser2Id = user2.id;
    user1Token = generateToken(user1);
    user2Token = generateToken(user2);
  });

  afterEach(async () => {
    // Clean up test applications
    await pool.query('DELETE FROM applications WHERE user_id IN ($1, $2)', [testUser1Id, testUser2Id]);
  });

  afterAll(async () => {
    // Clean up test applications first (due to foreign key)
    await pool.query('DELETE FROM applications WHERE user_id IN ($1, $2)', [testUser1Id, testUser2Id]);
    // Clean up test users
    await UserModel.delete(testUser1Id);
    await UserModel.delete(testUser2Id);
  });

  /**
   * Property 50: Cross-user access blocked
   * **Validates: Requirements 13.2**
   * 
   * For any user attempting to access (view, update, delete) another user's application,
   * the request should be rejected with a 403 authorization error.
   */
  test(
    'Property 50: Cross-user access blocked',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate application data for user 1
          fc.record({
            companyName: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            position: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().split('T')[0])
          }),
          // Generate application data for user 2
          fc.record({
            companyName: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            position: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().split('T')[0])
          }),
          async (user1Data: CreateApplicationDTO, user2Data: CreateApplicationDTO) => {
            // Create application for user 1
            const user1App = await ApplicationModel.create(testUser1Id, user1Data);
            expect(user1App.userId).toBe(testUser1Id);

            // Create application for user 2
            const user2App = await ApplicationModel.create(testUser2Id, user2Data);
            expect(user2App.userId).toBe(testUser2Id);

            // Test 1: User 1 should NOT be able to GET user 2's application
            const getResponse1 = await request(app)
              .get(`/api/applications/${user2App.id}`)
              .set('Authorization', `Bearer ${user1Token}`);

            expect(getResponse1.status).toBe(404); // Returns 404 instead of 403 for security (don't reveal existence)
            expect(getResponse1.body.error).toBeDefined();
            expect(getResponse1.body.error.code).toBe('NOT_FOUND');

            // Test 2: User 2 should NOT be able to GET user 1's application
            const getResponse2 = await request(app)
              .get(`/api/applications/${user1App.id}`)
              .set('Authorization', `Bearer ${user2Token}`);

            expect(getResponse2.status).toBe(404);
            expect(getResponse2.body.error).toBeDefined();
            expect(getResponse2.body.error.code).toBe('NOT_FOUND');

            // Test 3: User 1 should NOT be able to UPDATE user 2's application
            const updateResponse1 = await request(app)
              .put(`/api/applications/${user2App.id}`)
              .set('Authorization', `Bearer ${user1Token}`)
              .send({ notes: 'Hacked by user 1!' });

            expect(updateResponse1.status).toBe(404);
            expect(updateResponse1.body.error).toBeDefined();
            expect(updateResponse1.body.error.code).toBe('NOT_FOUND');

            // Test 4: User 2 should NOT be able to UPDATE user 1's application
            const updateResponse2 = await request(app)
              .put(`/api/applications/${user1App.id}`)
              .set('Authorization', `Bearer ${user2Token}`)
              .send({ notes: 'Hacked by user 2!' });

            expect(updateResponse2.status).toBe(404);
            expect(updateResponse2.body.error).toBeDefined();
            expect(updateResponse2.body.error.code).toBe('NOT_FOUND');

            // Test 5: User 1 should NOT be able to UPDATE STATUS of user 2's application
            const statusResponse1 = await request(app)
              .patch(`/api/applications/${user2App.id}/status`)
              .set('Authorization', `Bearer ${user1Token}`)
              .send({ status: 'Rejected' });

            expect(statusResponse1.status).toBe(404);
            expect(statusResponse1.body.error).toBeDefined();
            expect(statusResponse1.body.error.code).toBe('NOT_FOUND');

            // Test 6: User 2 should NOT be able to UPDATE STATUS of user 1's application
            const statusResponse2 = await request(app)
              .patch(`/api/applications/${user1App.id}/status`)
              .set('Authorization', `Bearer ${user2Token}`)
              .send({ status: 'Rejected' });

            expect(statusResponse2.status).toBe(404);
            expect(statusResponse2.body.error).toBeDefined();
            expect(statusResponse2.body.error.code).toBe('NOT_FOUND');

            // Test 7: User 1 should NOT be able to DELETE user 2's application
            const deleteResponse1 = await request(app)
              .delete(`/api/applications/${user2App.id}`)
              .set('Authorization', `Bearer ${user1Token}`);

            expect(deleteResponse1.status).toBe(404);

            // Test 8: User 2 should NOT be able to DELETE user 1's application
            const deleteResponse2 = await request(app)
              .delete(`/api/applications/${user1App.id}`)
              .set('Authorization', `Bearer ${user2Token}`);

            expect(deleteResponse2.status).toBe(404);

            // Verify both applications still exist for their respective owners
            const user1StillExists = await ApplicationModel.findById(testUser1Id, user1App.id);
            expect(user1StillExists).toBeDefined();
            expect(user1StillExists?.id).toBe(user1App.id);
            expect(user1StillExists?.userId).toBe(testUser1Id);

            const user2StillExists = await ApplicationModel.findById(testUser2Id, user2App.id);
            expect(user2StillExists).toBeDefined();
            expect(user2StillExists?.id).toBe(user2App.id);
            expect(user2StillExists?.userId).toBe(testUser2Id);

            // Verify applications were not modified
            expect(user1StillExists?.notes).toBe(user1Data.notes || null);
            expect(user2StillExists?.notes).toBe(user2Data.notes || null);
            expect(user1StillExists?.status).toBe(user1Data.status);
            expect(user2StillExists?.status).toBe(user2Data.status);

            // Test 9: User 1's GET ALL should only return their applications
            const listResponse1 = await request(app)
              .get('/api/applications')
              .set('Authorization', `Bearer ${user1Token}`);

            expect(listResponse1.status).toBe(200);
            expect(listResponse1.body.data.data).toBeInstanceOf(Array);
            expect(listResponse1.body.data.data.every((app: any) => app.userId === testUser1Id)).toBe(true);
            expect(listResponse1.body.data.data.some((app: any) => app.id === user1App.id)).toBe(true);
            expect(listResponse1.body.data.data.some((app: any) => app.id === user2App.id)).toBe(false);

            // Test 10: User 2's GET ALL should only return their applications
            const listResponse2 = await request(app)
              .get('/api/applications')
              .set('Authorization', `Bearer ${user2Token}`);

            expect(listResponse2.status).toBe(200);
            expect(listResponse2.body.data.data).toBeInstanceOf(Array);
            expect(listResponse2.body.data.data.every((app: any) => app.userId === testUser2Id)).toBe(true);
            expect(listResponse2.body.data.data.some((app: any) => app.id === user2App.id)).toBe(true);
            expect(listResponse2.body.data.data.some((app: any) => app.id === user1App.id)).toBe(false);

            // Clean up
            await ApplicationModel.delete(testUser1Id, user1App.id);
            await ApplicationModel.delete(testUser2Id, user2App.id);
          }
        ),
        { numRuns: 100 }
      );
    },
    120000 // 120 second timeout for property-based test with 100 runs (more complex test)
  );
});
