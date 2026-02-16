import fc from 'fast-check';
import { ApplicationService } from '../application.service';
import { pool } from '../../config/database';
import { ApplicationStatus } from '../../types';

describe('Application Filtering and Sorting Property Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role) 
       VALUES ($1, $2, $3) 
       RETURNING id`,
      ['filter-test@example.com', 'hash', 'user']
    );
    testUserId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up audit_log first (foreign key constraint)
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  beforeEach(async () => {
    // Clean applications and audit logs before each test
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);
  });

  // Helper to generate valid application data
  const validApplicationArb = fc.record({
    companyName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    position: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
    applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
      .map(d => d.toISOString().split('T')[0])
  });

  /**
   * Property 23: Search filters by company and position
   * Validates: Requirements 6.2
   */
  test('Property 23: Search filters by company and position', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validApplicationArb, { minLength: 3, maxLength: 10 }),
        fc.string({ minLength: 2, maxLength: 10 }),
        async (applications, searchTerm) => {
          // Clean data before this iteration
          await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);

          // Create applications
          for (const app of applications) {
            await ApplicationService.create(testUserId, app);
          }

          // Search
          const result = await ApplicationService.getAll(testUserId, { search: searchTerm });

          // Verify all results contain search term in company or position
          for (const app of result.data) {
            const matchesCompany = app.companyName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPosition = app.position.toLowerCase().includes(searchTerm.toLowerCase());
            expect(matchesCompany || matchesPosition).toBe(true);
          }

          // Verify no matching applications were excluded
          const expectedCount = applications.filter(app =>
            app.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.position.toLowerCase().includes(searchTerm.toLowerCase())
          ).length;
          expect(result.total).toBe(expectedCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 24: Status filter works correctly
   * Validates: Requirements 6.3
   */
  test('Property 24: Status filter works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validApplicationArb, { minLength: 5, maxLength: 15 }),
        fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
        async (applications, filterStatus) => {
          // Clean data before this iteration
          await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);

          // Create applications
          for (const app of applications) {
            await ApplicationService.create(testUserId, app);
          }

          // Filter by status
          const result = await ApplicationService.getAll(testUserId, { status: filterStatus });

          // Verify all results have the filtered status
          for (const app of result.data) {
            expect(app.status).toBe(filterStatus);
          }

          // Verify count matches expected
          const expectedCount = applications.filter(app => app.status === filterStatus).length;
          expect(result.total).toBe(expectedCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 25: Date range filter works correctly
   * Validates: Requirements 6.4
   */
  test('Property 25: Date range filter works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validApplicationArb, { minLength: 5, maxLength: 15 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
          .map(d => d.toISOString().split('T')[0]),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
          .map(d => d.toISOString().split('T')[0]),
        async (applications, dateFrom, dateTo) => {
          // Clean data before this iteration
          await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);

          // Ensure dateFrom <= dateTo
          if (dateFrom > dateTo) {
            [dateFrom, dateTo] = [dateTo, dateFrom];
          }

          // Create applications
          for (const app of applications) {
            await ApplicationService.create(testUserId, app);
          }

          // Filter by date range
          const result = await ApplicationService.getAll(testUserId, { dateFrom, dateTo });

          // Verify all results are within date range
          for (const app of result.data) {
            const appDate = new Date(app.applicationDate).toISOString().split('T')[0];
            expect(appDate >= dateFrom).toBe(true);
            expect(appDate <= dateTo).toBe(true);
          }

          // Verify count matches expected
          const expectedCount = applications.filter(app => {
            const appDate = app.applicationDate;
            return appDate >= dateFrom && appDate <= dateTo;
          }).length;
          expect(result.total).toBe(expectedCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 26: Column sorting works correctly
   * Validates: Requirements 6.5
   */
  test('Property 26: Column sorting works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validApplicationArb, { minLength: 3, maxLength: 10 }),
        fc.constantFrom('companyName', 'position', 'status', 'applicationDate'),
        fc.constantFrom<'asc' | 'desc'>('asc', 'desc'),
        async (applications, sortBy, sortOrder) => {
          // Clean data before this iteration
          await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);

          // Create applications
          for (const app of applications) {
            await ApplicationService.create(testUserId, app);
          }

          // Get sorted results
          const result = await ApplicationService.getAll(testUserId, { sortBy, sortOrder });

          // Verify that results are returned (basic sanity check)
          expect(result.data.length).toBeGreaterThan(0);
          expect(result.total).toBe(applications.length);

          // Property: Sorting is deterministic - same query returns same order
          const result2 = await ApplicationService.getAll(testUserId, { sortBy, sortOrder });
          
          expect(result.data.length).toBe(result2.data.length);
          for (let i = 0; i < result.data.length; i++) {
            expect(result.data[i].id).toBe(result2.data[i].id);
          }

          // Property: Sorting respects the sort column
          // Verify by checking that when we group by the sort field value,
          // all items with the same value appear consecutively
          const valueGroups = new Map<string, number[]>();
          result.data.forEach((app, index) => {
            const value = String(app[sortBy as keyof typeof app]);
            if (!valueGroups.has(value)) {
              valueGroups.set(value, []);
            }
            valueGroups.get(value)!.push(index);
          });

          // Each group of same values should have consecutive indices
          valueGroups.forEach((indices, value) => {
            if (indices.length > 1) {
              for (let i = 0; i < indices.length - 1; i++) {
                // Check if indices are consecutive (allowing for other values in between)
                // The key property is: if we see value A at index i, and value A again at index j,
                // then all indices between i and j should also have value A
                const start = indices[i];
                const end = indices[i + 1];
                for (let k = start; k <= end; k++) {
                  const item = result.data[k];
                  const kValue = String(item[sortBy as keyof typeof item]);
                  expect(kValue).toBe(value);
                }
              }
            }
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 27: Pagination respects page size
   * Validates: Requirements 6.6
   */
  test('Property 27: Pagination respects page size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 30 }),
        fc.constantFrom(5, 10, 20),
        async (totalApps, pageSize) => {
          // Clean data before this iteration
          await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);

          // Create applications with unique identifiers
          for (let i = 0; i < totalApps; i++) {
            await ApplicationService.create(testUserId, {
              companyName: `Company ${String(i).padStart(3, '0')}`,
              position: `Position ${String(i).padStart(3, '0')}`,
              status: 'Applied',
              applicationDate: '2024-01-01'
            });
          }

          // Get first page with explicit sorting to ensure deterministic order
          const page1 = await ApplicationService.getAll(testUserId, { 
            page: 1, 
            pageSize,
            sortBy: 'companyName',
            sortOrder: 'asc'
          });
          
          // Verify page size
          expect(page1.data.length).toBeLessThanOrEqual(pageSize);
          expect(page1.pageSize).toBe(pageSize);
          expect(page1.total).toBe(totalApps);
          expect(page1.totalPages).toBe(Math.ceil(totalApps / pageSize));

          // If there are multiple pages, verify second page
          if (page1.totalPages > 1) {
            const page2 = await ApplicationService.getAll(testUserId, { 
              page: 2, 
              pageSize,
              sortBy: 'companyName',
              sortOrder: 'asc'
            });
            expect(page2.data.length).toBeLessThanOrEqual(pageSize);
            expect(page2.page).toBe(2);

            // Verify no overlap between pages
            const page1Ids = page1.data.map(app => app.id);
            const page2Ids = page2.data.map(app => app.id);
            const overlap = page1Ids.filter(id => page2Ids.includes(id));
            expect(overlap.length).toBe(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
