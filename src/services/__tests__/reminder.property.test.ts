import fc from 'fast-check';
import { ApplicationService } from '../application.service';
import { ReminderService } from '../reminder.service';
import { pool } from '../../config/database';
import { UserModel } from '../../models';
import { ApplicationStatus } from '../../types';

// Test helpers
const createTestUser = async () => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  return UserModel.create(email, 'password123', 'user');
};

// Cleanup
afterEach(async () => {
  await pool.query('DELETE FROM reminder_sent');
  await pool.query('DELETE FROM applications');
  await pool.query('DELETE FROM audit_log');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

describe('Reminder Property Tests', () => {
  /**
   * Property 58: Reminder dates persisted
   * **Validates: Requirements 15.1**
   */
  test('Property 58: Reminder dates persisted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          companyName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          position: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
          applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .map(d => d.toISOString().split('T')[0]),
          reminderDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
            .map(d => d.toISOString().split('T')[0])
        }),
        async (applicationData) => {
          const user = await createTestUser();

          // Create application with reminder date
          const created = await ApplicationService.create(user.id, applicationData);

          // Verify reminder date is persisted
          expect(created.reminderDate).toBe(applicationData.reminderDate);

          // Retrieve and verify
          const retrieved = await ApplicationService.getById(user.id, created.id);
          expect(retrieved.reminderDate).toBe(applicationData.reminderDate);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property 59: Reminders sent once only
   * **Validates: Requirements 15.4**
   */
  test('Property 59: Reminders sent once only', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (numApplications) => {
          const user = await createTestUser();

          // Create applications with past reminder dates (due today or earlier)
          const today = new Date().toISOString().split('T')[0];
          const applicationIds: string[] = [];

          for (let i = 0; i < numApplications; i++) {
            const app = await ApplicationService.create(user.id, {
              companyName: `Company ${i}`,
              position: `Position ${i}`,
              status: 'Applied',
              applicationDate: today,
              reminderDate: today // Due today
            });
            applicationIds.push(app.id);
          }

          // Process reminders first time
          const firstRunCount = await ReminderService.processDueReminders();
          expect(firstRunCount).toBe(numApplications);

          // Verify all reminders are marked as sent
          for (const appId of applicationIds) {
            const status = await ReminderService.getReminderStatus(appId);
            expect(status.sent).toBe(true);
            expect(status.sentAt).toBeDefined();
          }

          // Process reminders second time
          const secondRunCount = await ReminderService.processDueReminders();
          
          // Should be 0 because all reminders were already sent
          expect(secondRunCount).toBe(0);

          // Process reminders third time (idempotence check)
          const thirdRunCount = await ReminderService.processDueReminders();
          expect(thirdRunCount).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Additional test: Only due reminders are processed
   */
  test('Only due reminders are processed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.integer({ min: 1, max: 3 }), // Past reminders
          fc.integer({ min: 1, max: 3 })  // Future reminders
        ),
        async ([numPast, numFuture]) => {
          const user = await createTestUser();

          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          // Create applications with past reminder dates (due)
          for (let i = 0; i < numPast; i++) {
            await ApplicationService.create(user.id, {
              companyName: `Past Company ${i}`,
              position: `Position ${i}`,
              status: 'Applied',
              applicationDate: yesterday.toISOString().split('T')[0],
              reminderDate: yesterday.toISOString().split('T')[0]
            });
          }

          // Create applications with future reminder dates (not due)
          for (let i = 0; i < numFuture; i++) {
            await ApplicationService.create(user.id, {
              companyName: `Future Company ${i}`,
              position: `Position ${i}`,
              status: 'Applied',
              applicationDate: today.toISOString().split('T')[0],
              reminderDate: tomorrow.toISOString().split('T')[0]
            });
          }

          // Process reminders
          const count = await ReminderService.processDueReminders();

          // Only past reminders should be processed
          expect(count).toBe(numPast);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Additional test: Reminder status tracking
   */
  test('Reminder status can be checked', async () => {
    const user = await createTestUser();
    const today = new Date().toISOString().split('T')[0];

    // Create application with reminder
    const app = await ApplicationService.create(user.id, {
      companyName: 'Test Company',
      position: 'Test Position',
      status: 'Applied',
      applicationDate: today,
      reminderDate: today
    });

    // Check status before sending
    const statusBefore = await ReminderService.getReminderStatus(app.id);
    expect(statusBefore.sent).toBe(false);
    expect(statusBefore.sentAt).toBeUndefined();

    // Process reminders
    await ReminderService.processDueReminders();

    // Check status after sending
    const statusAfter = await ReminderService.getReminderStatus(app.id);
    expect(statusAfter.sent).toBe(true);
    expect(statusAfter.sentAt).toBeDefined();
  }, 30000);
});
