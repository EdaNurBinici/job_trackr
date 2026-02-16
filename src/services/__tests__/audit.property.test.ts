import fc from 'fast-check';
import { ApplicationService } from '../application.service';
import { AuditService } from '../audit.service';
import { UserModel } from '../../models';
import { pool } from '../../config/database';
import { CreateApplicationDTO, UpdateApplicationDTO, ApplicationStatus } from '../../types';

/**
 * Property-Based Tests for Audit Logging
 * Feature: job-trackr
 */

describe('Audit Logging - Property-Based Tests', () => {
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    // Create a test user with unique email
    const timestamp = Date.now();
    testUserEmail = `audit-pbt-user-${timestamp}@pbt-test.com`;
    const user = await UserModel.create(testUserEmail, 'password123');
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);
    await UserModel.delete(testUserId);
  });

  /**
   * Property 15: Status changes logged in audit
   * **Validates: Requirements 3.3**
   * 
   * For any application status change, the audit log should contain an entry with
   * the user ID, before value, after value, and timestamp.
   */
  test(
    'Property 15: Status changes logged in audit',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate initial application data
          fc.record({
            companyName: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            position: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().split('T')[0])
          }),
          // Generate a different status for the update
          fc.constantFrom<ApplicationStatus>('Offer', 'Rejected'),
          async (initialData: CreateApplicationDTO, newStatus: ApplicationStatus) => {
            // Create initial application
            const created = await ApplicationService.create(testUserId, initialData);
            const initialStatus = created.status;

            // Update the status
            const updated = await ApplicationService.updateStatus(testUserId, created.id, newStatus);

            // Verify the status was updated
            expect(updated.status).toBe(newStatus);

            // Get audit logs for this application
            const auditLogs = await AuditService.getEntityAuditLog('application', created.id);

            // Find the UPDATE audit entry (should be the most recent)
            const updateLog = auditLogs.find(log => log.action === 'UPDATE');
            expect(updateLog).toBeDefined();

            // Verify audit log contains correct information
            expect(updateLog!.userId).toBe(testUserId);
            expect(updateLog!.entity).toBe('application');
            expect(updateLog!.entityId).toBe(created.id);
            expect(updateLog!.action).toBe('UPDATE');
            expect(updateLog!.timestamp).toBeDefined();

            // Verify before and after values
            expect(updateLog!.beforeData).toBeDefined();
            expect(updateLog!.afterData).toBeDefined();
            expect(updateLog!.beforeData.status).toBe(initialStatus);
            expect(updateLog!.afterData.status).toBe(newStatus);

            // Clean up
            await ApplicationService.delete(testUserId, created.id);
          }
        ),
        { numRuns: 20 }
      );
    },
    60000
  );

  /**
   * Property 41: All modifications logged
   * **Validates: Requirements 11.1, 11.2, 11.3**
   * 
   * For any data modification operation (create, update, delete) on an application,
   * the audit log should contain an entry with user ID, entity type, entity ID,
   * action type, and timestamp.
   */
  test(
    'Property 41: All modifications logged',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate application data
          fc.record({
            companyName: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            position: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().split('T')[0]),
            notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined })
          }),
          // Generate update data
          fc.record({
            notes: fc.string({ maxLength: 500 })
          }),
          async (createData: CreateApplicationDTO, updateData: UpdateApplicationDTO) => {
            // CREATE operation
            const created = await ApplicationService.create(testUserId, createData);

            // Verify CREATE was logged
            let auditLogs = await AuditService.getEntityAuditLog('application', created.id);
            const createLog = auditLogs.find(log => log.action === 'CREATE');
            expect(createLog).toBeDefined();
            expect(createLog!.userId).toBe(testUserId);
            expect(createLog!.entity).toBe('application');
            expect(createLog!.entityId).toBe(created.id);
            expect(createLog!.action).toBe('CREATE');
            expect(createLog!.timestamp).toBeDefined();
            expect(createLog!.afterData).toBeDefined();

            // UPDATE operation
            const updated = await ApplicationService.update(testUserId, created.id, updateData);
            expect(updated.notes).toBe(updateData.notes);

            // Verify UPDATE was logged
            auditLogs = await AuditService.getEntityAuditLog('application', created.id);
            const updateLog = auditLogs.find(log => log.action === 'UPDATE');
            expect(updateLog).toBeDefined();
            expect(updateLog!.userId).toBe(testUserId);
            expect(updateLog!.entity).toBe('application');
            expect(updateLog!.entityId).toBe(created.id);
            expect(updateLog!.action).toBe('UPDATE');
            expect(updateLog!.timestamp).toBeDefined();

            // DELETE operation
            await ApplicationService.delete(testUserId, created.id);

            // Verify DELETE was logged
            auditLogs = await AuditService.getEntityAuditLog('application', created.id);
            const deleteLog = auditLogs.find(log => log.action === 'DELETE');
            expect(deleteLog).toBeDefined();
            expect(deleteLog!.userId).toBe(testUserId);
            expect(deleteLog!.entity).toBe('application');
            expect(deleteLog!.entityId).toBe(created.id);
            expect(deleteLog!.action).toBe('DELETE');
            expect(deleteLog!.timestamp).toBeDefined();
            expect(deleteLog!.beforeData).toBeDefined();

            // Verify all three operations were logged
            expect(auditLogs.length).toBeGreaterThanOrEqual(3);
            expect(auditLogs.some(log => log.action === 'CREATE')).toBe(true);
            expect(auditLogs.some(log => log.action === 'UPDATE')).toBe(true);
            expect(auditLogs.some(log => log.action === 'DELETE')).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    },
    60000
  );

  /**
   * Property 42: Update audit entries contain before/after
   * **Validates: Requirements 11.2**
   * 
   * For any application update, the audit log entry should contain both the
   * before and after values as JSON.
   */
  test(
    'Property 42: Update audit entries contain before/after',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate initial application data
          fc.record({
            companyName: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            position: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().split('T')[0]),
            notes: fc.string({ maxLength: 500 })
          }),
          // Generate update data with different values
          fc.record({
            companyName: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            position: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            notes: fc.string({ maxLength: 500 })
          }),
          async (initialData: CreateApplicationDTO, updateData: UpdateApplicationDTO) => {
            // Create initial application
            const created = await ApplicationService.create(testUserId, initialData);

            // Store the initial values
            const beforeCompanyName = created.companyName;
            const beforePosition = created.position;
            const beforeNotes = created.notes;

            // Update the application
            const updated = await ApplicationService.update(testUserId, created.id, updateData);
            expect(updated.companyName).toBe(updateData.companyName);

            // Get audit logs for this application
            const auditLogs = await AuditService.getEntityAuditLog('application', created.id);

            // Find the UPDATE audit entry
            const updateLog = auditLogs.find(log => log.action === 'UPDATE');
            expect(updateLog).toBeDefined();

            // Verify beforeData contains the original values
            expect(updateLog!.beforeData).toBeDefined();
            expect(typeof updateLog!.beforeData).toBe('object');
            expect(updateLog!.beforeData.id).toBe(created.id);
            expect(updateLog!.beforeData.companyName).toBe(beforeCompanyName);
            expect(updateLog!.beforeData.position).toBe(beforePosition);
            expect(updateLog!.beforeData.notes).toBe(beforeNotes);

            // Verify afterData contains the updated values
            expect(updateLog!.afterData).toBeDefined();
            expect(typeof updateLog!.afterData).toBe('object');
            expect(updateLog!.afterData.id).toBe(created.id);
            expect(updateLog!.afterData.companyName).toBe(updateData.companyName);
            expect(updateLog!.afterData.position).toBe(updateData.position);
            expect(updateLog!.afterData.notes).toBe(updateData.notes);

            // Verify the data is stored as JSONB (can be queried as objects)
            expect(updateLog!.beforeData.userId).toBe(testUserId);
            expect(updateLog!.afterData.userId).toBe(testUserId);

            // Clean up
            await ApplicationService.delete(testUserId, created.id);
          }
        ),
        { numRuns: 20 }
      );
    },
    60000
  );
});
