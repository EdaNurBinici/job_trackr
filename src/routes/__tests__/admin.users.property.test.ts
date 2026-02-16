import fc from 'fast-check';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models';
import { generateToken } from '../../utils/jwt';

/**
 * Property-Based Tests for Admin User Management
 * Feature: job-trackr
 */

describe('Admin User List - Property-Based Tests', () => {
  let adminUserId: string;
  let regularUserId: string;
  let adminUserEmail: string;
  let regularUserEmail: string;
  let adminToken: string;
  let regularToken: string;

  beforeAll(async () => {
    // Create an admin user and a regular user
    const timestamp = Date.now();
    adminUserEmail = `admin-users-${timestamp}@pbt-test.com`;
    regularUserEmail = `regular-users-${timestamp}@pbt-test.com`;
    
    const adminUser = await UserModel.create(adminUserEmail, 'password123', 'admin');
    const regularUser = await UserModel.create(regularUserEmail, 'password123', 'user');
    adminUserId = adminUser.id;
    regularUserId = regularUser.id;
    adminToken = generateToken(adminUser);
    regularToken = generateToken(regularUser);
  });

  afterAll(async () => {
    // Clean up test users
    await UserModel.delete(adminUserId);
    await UserModel.delete(regularUserId);
  });

  /**
   * Property 35: Admin user list complete
   * **Validates: Requirements 9.1**
   * 
   * For any set of registered users, the admin user list should display all users
   * with their email and registration date.
   */
  test(
    'Property 35: Admin user list complete',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a set of user data
          fc.array(
            fc.record({
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8, maxLength: 20 }),
              role: fc.constantFrom('user', 'admin')
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (usersData) => {
            const createdUserIds: string[] = [];

            try {
              // Create test users
              for (const userData of usersData) {
                // Make email unique by adding timestamp
                const uniqueEmail = `pbt-${Date.now()}-${Math.random().toString(36).substring(7)}-${userData.email}`;
                const user = await UserModel.create(uniqueEmail, userData.password, userData.role as 'user' | 'admin');
                createdUserIds.push(user.id);
              }

              // Admin should be able to access user list
              const adminResponse = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

              expect(adminResponse.status).toBe(200);
              expect(adminResponse.body.data).toBeDefined();
              expect(adminResponse.body.data).toBeInstanceOf(Array);

              const userList = adminResponse.body.data;

              // Verify all created users are in the list
              for (const userId of createdUserIds) {
                const userInList = userList.find((u: any) => u.id === userId);
                expect(userInList).toBeDefined();
                expect(userInList.email).toBeDefined();
                expect(userInList.createdAt).toBeDefined();
                expect(userInList.role).toBeDefined();
                
                // Verify email format
                expect(typeof userInList.email).toBe('string');
                expect(userInList.email).toContain('@');
                
                // Verify createdAt is a valid date
                expect(new Date(userInList.createdAt).toString()).not.toBe('Invalid Date');
                
                // Verify role is valid
                expect(['user', 'admin']).toContain(userInList.role);
              }

              // Verify the admin and regular users from beforeAll are also in the list
              const adminInList = userList.find((u: any) => u.id === adminUserId);
              expect(adminInList).toBeDefined();
              expect(adminInList.email).toBe(adminUserEmail);

              const regularInList = userList.find((u: any) => u.id === regularUserId);
              expect(regularInList).toBeDefined();
              expect(regularInList.email).toBe(regularUserEmail);

              // Regular user should NOT be able to access user list (Property 36)
              const regularResponse = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${regularToken}`);

              expect(regularResponse.status).toBe(403);
              expect(regularResponse.body.error).toBeDefined();
              expect(regularResponse.body.error.code).toBe('FORBIDDEN');
              expect(regularResponse.body.error.message).toBe('Admin access required');

              // Unauthenticated request should be rejected
              const unauthResponse = await request(app)
                .get('/api/admin/users');

              expect(unauthResponse.status).toBe(401);

            } finally {
              // Clean up created users
              for (const userId of createdUserIds) {
                await UserModel.delete(userId);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    },
    60000
  );
});
