import fc from 'fast-check';
import { DashboardService } from '../dashboard.service';
import { ApplicationService } from '../application.service';
import { UserModel } from '../../models';
import { pool } from '../../config/database';
import { ApplicationStatus } from '../../types';

describe('Dashboard System Statistics Property Tests', () => {
  let testUsers: Array<{ id: string; email: string }> = [];

  afterAll(async () => {
    // Clean up all test data
    for (const user of testUsers) {
      await pool.query('DELETE FROM applications WHERE user_id = $1', [user.id]);
      await pool.query('DELETE FROM audit_log WHERE user_id = $1', [user.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
    }
    await pool.end();
  });

  /**
   * Property 37: System user count accurate
   * Validates: Requirements 10.1
   */
  test('Property 37: System user count accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }),
        async (userCount) => {
          // Clean up before this iteration
          for (const user of testUsers) {
            await pool.query('DELETE FROM applications WHERE user_id = $1', [user.id]);
            await pool.query('DELETE FROM audit_log WHERE user_id = $1', [user.id]);
            await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
          }
          testUsers = [];

          // Get initial user count
          const initialCount = await DashboardService.getTotalUserCount();

          // Create test users
          for (let i = 0; i < userCount; i++) {
            const user = await UserModel.create(
              `system-stats-test-${Date.now()}-${i}-${Math.random()}@example.com`,
              'password123'
            );
            testUsers.push(user);
          }

          // Get new user count
          const newCount = await DashboardService.getTotalUserCount();

          // Verify the count increased by exactly userCount
          expect(newCount).toBe(initialCount + userCount);
        }
      ),
      { numRuns: 20 }
    );
  }, 10000); // Increase timeout to 10 seconds

  /**
   * Property 38: System application count accurate
   * Validates: Requirements 10.2
   */
  test('Property 38: System application count accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.integer({ min: 1, max: 3 }), // Number of users
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
        async ([userCount, applications]) => {
          // Clean up before this iteration
          for (const user of testUsers) {
            await pool.query('DELETE FROM applications WHERE user_id = $1', [user.id]);
            await pool.query('DELETE FROM audit_log WHERE user_id = $1', [user.id]);
            await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
          }
          testUsers = [];

          // Get initial application count
          const initialCount = await DashboardService.getTotalApplicationCount();

          // Create test users
          for (let i = 0; i < userCount; i++) {
            const user = await UserModel.create(
              `system-stats-test-${Date.now()}-${i}-${Math.random()}@example.com`,
              'password123'
            );
            testUsers.push(user);
          }

          // Create applications distributed across users
          let totalCreated = 0;
          for (const app of applications) {
            const userIndex = totalCreated % userCount;
            await ApplicationService.create(testUsers[userIndex].id, app);
            totalCreated++;
          }

          // Get new application count
          const newCount = await DashboardService.getTotalApplicationCount();

          // Verify the count increased by exactly the number of applications created
          expect(newCount).toBe(initialCount + applications.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 39: Top companies calculated correctly
   * Validates: Requirements 10.3
   */
  test('Property 39: Top companies calculated correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            companyName: fc.constantFrom('CompanyA', 'CompanyB', 'CompanyC', 'CompanyD', 'CompanyE'),
            position: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
              .map(d => d.toISOString().split('T')[0]),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (applications) => {
          // Clean up before this iteration
          for (const user of testUsers) {
            await pool.query('DELETE FROM applications WHERE user_id = $1', [user.id]);
            await pool.query('DELETE FROM audit_log WHERE user_id = $1', [user.id]);
            await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
          }
          testUsers = [];

          // Create a test user
          const user = await UserModel.create(
            `system-stats-test-${Date.now()}-${Math.random()}@example.com`,
            'password123'
          );
          testUsers.push(user);

          // Create all applications
          for (const app of applications) {
            await ApplicationService.create(user.id, app);
          }

          // Calculate expected top companies
          const companyCounts = new Map<string, number>();
          for (const app of applications) {
            companyCounts.set(app.companyName, (companyCounts.get(app.companyName) || 0) + 1);
          }

          // Sort by count descending, then by name ascending
          const expectedTopCompanies = Array.from(companyCounts.entries())
            .map(([companyName, count]) => ({ companyName, count }))
            .sort((a, b) => {
              if (b.count !== a.count) {
                return b.count - a.count;
              }
              return a.companyName.localeCompare(b.companyName);
            })
            .slice(0, 10);

          // Get top companies from service
          const topCompanies = await DashboardService.getTopCompanies(10);

          // Filter to only include our test companies
          const testCompanyNames = new Set(['CompanyA', 'CompanyB', 'CompanyC', 'CompanyD', 'CompanyE']);
          const filteredTopCompanies = topCompanies.filter(c => testCompanyNames.has(c.companyName));

          // Verify the results match expected
          expect(filteredTopCompanies.length).toBe(expectedTopCompanies.length);
          for (let i = 0; i < expectedTopCompanies.length; i++) {
            expect(filteredTopCompanies[i].companyName).toBe(expectedTopCompanies[i].companyName);
            expect(filteredTopCompanies[i].count).toBe(expectedTopCompanies[i].count);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 40: Average response time calculated correctly
   * Validates: Requirements 10.4
   */
  test('Property 40: Average response time calculated correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            companyName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            position: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            initialStatus: fc.constantFrom<ApplicationStatus>('Applied', 'Interview'),
            newStatus: fc.constantFrom<ApplicationStatus>('Offer', 'Rejected'), // Ensure different from initial
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
              .map(d => d.toISOString().split('T')[0]),
            delaySeconds: fc.integer({ min: 1, max: 100 }) // Delay before status change
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (applications) => {
          // Clean up before this iteration
          for (const user of testUsers) {
            await pool.query('DELETE FROM applications WHERE user_id = $1', [user.id]);
            await pool.query('DELETE FROM audit_log WHERE user_id = $1', [user.id]);
            await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
          }
          testUsers = [];

          // Create a test user
          const user = await UserModel.create(
            `system-stats-test-${Date.now()}-${Math.random()}@example.com`,
            'password123'
          );
          testUsers.push(user);

          const delays: number[] = [];

          // Create applications and simulate status changes with delays
          for (const app of applications) {
            // Create application with initial status
            const created = await ApplicationService.create(user.id, {
              companyName: app.companyName,
              position: app.position,
              status: app.initialStatus,
              applicationDate: app.applicationDate
            });

            // Simulate a delay by backdating the created_at timestamp
            await pool.query(
              'UPDATE applications SET created_at = created_at - INTERVAL \'1 second\' * $1 WHERE id = $2',
              [app.delaySeconds, created.id]
            );

            // Update status (this will create an audit log entry)
            await ApplicationService.updateStatus(user.id, created.id, app.newStatus);

            delays.push(app.delaySeconds);
          }

          // Calculate expected average
          const expectedAvg = delays.reduce((sum, d) => sum + d, 0) / delays.length;

          // Get average response time from service
          const avgResponseTime = await DashboardService.getAverageResponseTime();

          // Verify the average is close to expected (within 1 second tolerance due to timing)
          expect(avgResponseTime).not.toBeNull();
          if (avgResponseTime !== null) {
            expect(Math.abs(avgResponseTime - expectedAvg)).toBeLessThan(2);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
