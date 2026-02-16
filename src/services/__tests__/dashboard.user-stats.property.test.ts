import fc from 'fast-check';
import { ApplicationService } from '../application.service';
import { UserModel } from '../../models';
import { pool } from '../../config/database';
import { ApplicationStatus } from '../../types';

describe('Dashboard User Statistics Property Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user
    const testUser = await UserModel.create(
      `dashboard-test-${Date.now()}@example.com`,
      'password123'
    );
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  /**
   * Property 16: Total application count accurate
   * Validates: Requirements 4.1
   */
  test('Property 16: Total application count accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            companyName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            position: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
              .map(d => d.toISOString().split('T')[0]),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (applications) => {
          // Clean up before this iteration
          await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);

          // Create all applications
          for (const app of applications) {
            await ApplicationService.create(testUserId, app);
          }

          // Get user stats
          const stats = await ApplicationService.getUserStats(testUserId);

          // Verify total count matches
          expect(stats.totalApplications).toBe(applications.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 17: Status-based counts accurate
   * Validates: Requirements 4.2, 4.3, 4.4
   */
  test('Property 17: Status-based counts accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            companyName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            position: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
              .map(d => d.toISOString().split('T')[0]),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (applications) => {
          // Clean up before this iteration
          await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);

          // Create all applications
          for (const app of applications) {
            await ApplicationService.create(testUserId, app);
          }

          // Count expected values
          const expectedInterview = applications.filter(a => a.status === 'Interview').length;
          const expectedOffer = applications.filter(a => a.status === 'Offer').length;
          const expectedRejected = applications.filter(a => a.status === 'Rejected').length;

          // Get user stats
          const stats = await ApplicationService.getUserStats(testUserId);

          // Verify status counts match
          expect(stats.interviewCount).toBe(expectedInterview);
          expect(stats.offerCount).toBe(expectedOffer);
          expect(stats.rejectedCount).toBe(expectedRejected);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 18: Recent activity filtered by date
   * Validates: Requirements 4.5
   */
  test('Property 18: Recent activity filtered by date', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // Recent applications (within last 7 days)
          fc.array(
            fc.record({
              companyName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              position: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
              applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
                .map(d => d.toISOString().split('T')[0]),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          // Old applications (more than 7 days ago)
          fc.array(
            fc.record({
              companyName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              position: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
              applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
                .map(d => d.toISOString().split('T')[0]),
            }),
            { minLength: 0, maxLength: 10 }
          )
        ),
        async ([recentApps, oldApps]) => {
          // Clean up before this iteration
          await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);

          // Create recent applications (will have created_at within last 7 days)
          const recentIds: string[] = [];
          for (const app of recentApps) {
            const created = await ApplicationService.create(testUserId, app);
            recentIds.push(created.id);
          }

          // Create old applications and manually update their created_at to be older
          for (const app of oldApps) {
            const created = await ApplicationService.create(testUserId, app);
            // Update created_at to be 10 days ago
            await pool.query(
              'UPDATE applications SET created_at = NOW() - INTERVAL \'10 days\' WHERE id = $1',
              [created.id]
            );
          }

          // Get recent activity (last 7 days)
          const activity = await ApplicationService.getRecentActivity(testUserId, 7);

          // Verify only recent applications are returned
          expect(activity.length).toBe(recentApps.length);
          
          // Verify all returned applications are in the recent list
          const activityIds = activity.map(a => a.id);
          for (const id of activityIds) {
            expect(recentIds).toContain(id);
          }

          // Verify all recent applications are in the activity
          for (const id of recentIds) {
            expect(activityIds).toContain(id);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 19: Dashboard statistics user-scoped
   * Validates: Requirements 4.6
   */
  test('Property 19: Dashboard statistics user-scoped', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // User 1 applications
          fc.array(
            fc.record({
              companyName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              position: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
              applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
                .map(d => d.toISOString().split('T')[0]),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          // User 2 applications
          fc.array(
            fc.record({
              companyName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              position: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
              applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
                .map(d => d.toISOString().split('T')[0]),
            }),
            { minLength: 0, maxLength: 10 }
          )
        ),
        async ([user1Apps, user2Apps]) => {
          // Clean up before this iteration
          await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);

          // Create second test user
          const user2 = await UserModel.create(
            `dashboard-test-user2-${Date.now()}-${Math.random()}@example.com`,
            'password123'
          );

          try {
            // Create applications for user 1
            for (const app of user1Apps) {
              await ApplicationService.create(testUserId, app);
            }

            // Create applications for user 2
            for (const app of user2Apps) {
              await ApplicationService.create(user2.id, app);
            }

            // Get stats for user 1
            const user1Stats = await ApplicationService.getUserStats(testUserId);

            // Calculate expected counts for user 1
            const expectedUser1Total = user1Apps.length;
            const expectedUser1Interview = user1Apps.filter(a => a.status === 'Interview').length;
            const expectedUser1Offer = user1Apps.filter(a => a.status === 'Offer').length;
            const expectedUser1Rejected = user1Apps.filter(a => a.status === 'Rejected').length;

            // Verify user 1 stats only include user 1 data
            expect(user1Stats.totalApplications).toBe(expectedUser1Total);
            expect(user1Stats.interviewCount).toBe(expectedUser1Interview);
            expect(user1Stats.offerCount).toBe(expectedUser1Offer);
            expect(user1Stats.rejectedCount).toBe(expectedUser1Rejected);

            // Get stats for user 2
            const user2Stats = await ApplicationService.getUserStats(user2.id);

            // Calculate expected counts for user 2
            const expectedUser2Total = user2Apps.length;
            const expectedUser2Interview = user2Apps.filter(a => a.status === 'Interview').length;
            const expectedUser2Offer = user2Apps.filter(a => a.status === 'Offer').length;
            const expectedUser2Rejected = user2Apps.filter(a => a.status === 'Rejected').length;

            // Verify user 2 stats only include user 2 data
            expect(user2Stats.totalApplications).toBe(expectedUser2Total);
            expect(user2Stats.interviewCount).toBe(expectedUser2Interview);
            expect(user2Stats.offerCount).toBe(expectedUser2Offer);
            expect(user2Stats.rejectedCount).toBe(expectedUser2Rejected);

            // Get recent activity for user 1
            const user1Activity = await ApplicationService.getRecentActivity(testUserId, 7);

            // Verify all activity belongs to user 1
            for (const activity of user1Activity) {
              expect(activity.userId).toBe(testUserId);
            }
          } finally {
            // Clean up user 2 data
            await pool.query('DELETE FROM applications WHERE user_id = $1', [user2.id]);
            await pool.query('DELETE FROM audit_log WHERE user_id = $1', [user2.id]);
            await pool.query('DELETE FROM users WHERE id = $1', [user2.id]);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
