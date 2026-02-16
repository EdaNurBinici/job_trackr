import fc from 'fast-check';
import { ApplicationService } from '../application.service';
import { UserModel } from '../../models';
import { pool } from '../../config/database';
import { CreateApplicationDTO, ApplicationStatus } from '../../types';

/**
 * Property-Based Tests for Application Status Management
 * Feature: job-trackr
 */

describe('Application Status Management - Property-Based Tests', () => {
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    // Create a test user with unique email
    const timestamp = Date.now();
    testUserEmail = `status-pbt-user-${timestamp}@pbt-test.com`;
    
    const user = await UserModel.create(testUserEmail, 'password123');
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test applications and audit logs
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);
  });

  afterAll(async () => {
    // Clean up test applications and audit logs first (due to foreign key)
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);
    // Clean up test user
    await UserModel.delete(testUserId);
  });

  /**
   * Property 13: Valid status updates recorded
   * **Validates: Requirements 3.1**
   * 
   * For any application and valid status value (Applied, Interview, Offer, Rejected),
   * updating the status should persist the change and update the timestamp.
   */
  test(
    'Property 13: Valid status updates recorded',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate initial application data
          fc.record({
            companyName: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            position: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().split('T')[0])
          }),
          // Generate a new status to update to
          fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
          async (initialData: CreateApplicationDTO, newStatus: ApplicationStatus) => {
            // Create initial application
            const created = await ApplicationService.create(testUserId, initialData);
            expect(created.status).toBe(initialData.status);
            
            const originalUpdatedAt = created.updatedAt;

            // Wait a tiny bit to ensure timestamp changes
            await new Promise(resolve => setTimeout(resolve, 10));

            // Update the status
            const updated = await ApplicationService.updateStatus(testUserId, created.id, newStatus);

            // Verify status was updated
            expect(updated).toBeDefined();
            expect(updated.id).toBe(created.id);
            expect(updated.userId).toBe(testUserId);
            expect(updated.status).toBe(newStatus);

            // Verify timestamp was updated
            expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
              new Date(originalUpdatedAt).getTime()
            );

            // Verify other fields remain unchanged
            expect(updated.companyName).toBe(created.companyName);
            expect(updated.position).toBe(created.position);
            expect(updated.applicationDate).toBe(created.applicationDate);
            expect(updated.notes).toBe(created.notes);
            expect(updated.sourceLink).toBe(created.sourceLink);
            expect(updated.reminderDate).toBe(created.reminderDate);

            // Verify the status change persists when retrieved again
            const retrieved = await ApplicationService.getById(testUserId, updated.id);
            expect(retrieved.status).toBe(newStatus);
            expect(new Date(retrieved.updatedAt).getTime()).toBe(new Date(updated.updatedAt).getTime());

            // Clean up
            await ApplicationService.delete(testUserId, created.id);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000 // 60 second timeout for property-based test with 100 runs
  );
});
