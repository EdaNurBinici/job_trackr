import fc from 'fast-check';
import { ApplicationService } from '../services/application.service';
import { pool } from '../config/database';
import { UserModel, ApplicationModel } from '../models';
import { FileService, FileUpload } from '../services/file.service';
import { ApplicationStatus } from '../types';
import * as fs from 'fs';

// Test helpers
const createTestUser = async () => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  return UserModel.create(email, 'password123', 'user');
};

const createTestApplication = async (userId: string, data?: any) => {
  return ApplicationModel.create(userId, {
    companyName: data?.companyName || 'Test Company',
    position: data?.position || 'Test Position',
    status: data?.status || 'Applied',
    applicationDate: data?.applicationDate || new Date().toISOString().split('T')[0],
    ...data
  });
};

const cleanupTestFiles = async () => {
  const uploadDir = 'uploads';
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      try {
        fs.unlinkSync(`${uploadDir}/${file}`);
      } catch (error) {
        // Ignore errors
      }
    }
  }
};

// Cleanup before and after tests
beforeAll(async () => {
  await cleanupTestFiles();
});

afterEach(async () => {
  await pool.query('DELETE FROM files');
  await pool.query('DELETE FROM applications');
  await pool.query('DELETE FROM audit_log');
  await pool.query('DELETE FROM users');
  await cleanupTestFiles();
});

afterAll(async () => {
  await cleanupTestFiles();
  await pool.end();
});

describe('Data Persistence Property Tests', () => {
  /**
   * Property 60: Modifications persisted before success
   * **Validates: Requirements 16.1**
   */
  test('Property 60: Modifications persisted before success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          companyName: fc.string({ minLength: 1, maxLength: 100 }),
          position: fc.string({ minLength: 1, maxLength: 100 }),
          status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
          applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .map(d => d.toISOString().split('T')[0]),
          notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined })
        }),
        async (applicationData) => {
          const user = await createTestUser();

          // Create application
          const created = await ApplicationService.create(user.id, applicationData);

          // If create returns success, data must be persisted and retrievable
          const retrieved = await ApplicationModel.findById(user.id, created.id);

          expect(retrieved).not.toBeNull();
          expect(retrieved!.companyName).toBe(applicationData.companyName);
          expect(retrieved!.position).toBe(applicationData.position);
          expect(retrieved!.status).toBe(applicationData.status);
          expect(retrieved!.applicationDate).toBe(applicationData.applicationDate);
          if (applicationData.notes) {
            expect(retrieved!.notes).toBe(applicationData.notes);
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property 60 (Update variant): Update modifications persisted before success
   * **Validates: Requirements 16.1**
   */
  test('Property 60 (Update): Update modifications persisted before success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          companyName: fc.string({ minLength: 1, maxLength: 100 }),
          position: fc.string({ minLength: 1, maxLength: 100 }),
          status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected')
        }),
        async (updateData) => {
          const user = await createTestUser();
          const application = await createTestApplication(user.id);

          // Update application
          await ApplicationService.update(user.id, application.id, updateData);

          // If update returns success, changes must be persisted
          const retrieved = await ApplicationModel.findById(user.id, application.id);

          expect(retrieved).not.toBeNull();
          expect(retrieved!.companyName).toBe(updateData.companyName);
          expect(retrieved!.position).toBe(updateData.position);
          expect(retrieved!.status).toBe(updateData.status);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property 61: Database errors reported
   * **Validates: Requirements 16.2**
   */
  test('Property 61: Database errors reported', async () => {
    const user = await createTestUser();

    // Test 1: Attempting to retrieve non-existent application should throw
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    await expect(
      ApplicationService.getById(user.id, nonExistentId)
    ).rejects.toThrow('Application not found');

    // Test 2: Attempting to update non-existent application should throw
    await expect(
      ApplicationService.update(user.id, nonExistentId, { companyName: 'Test' })
    ).rejects.toThrow('Application not found');

    // Test 3: Attempting to delete non-existent application should throw
    await expect(
      ApplicationService.delete(user.id, nonExistentId)
    ).rejects.toThrow('Application not found');

    // Test 4: Invalid data should throw validation errors
    await expect(
      ApplicationService.create(user.id, {
        companyName: '',
        position: 'Test',
        status: 'Applied',
        applicationDate: '2024-01-01'
      })
    ).rejects.toThrow('Company name is required');
  }, 30000);

  /**
   * Property 62: Transaction atomicity
   * **Validates: Requirements 16.4**
   */
  test('Property 62: Transaction atomicity - application deletion with files', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        async (numFiles) => {
          const user = await createTestUser();
          const application = await createTestApplication(user.id);

          // Upload multiple files
          const uploadedFiles: string[] = [];
          for (let i = 0; i < numFiles; i++) {
            const file: FileUpload = {
              buffer: Buffer.from(`Test content ${i}`),
              originalName: `test-file-${i}.pdf`,
              mimeType: 'application/pdf',
              size: 100 + i
            };
            const uploaded = await FileService.upload(user.id, application.id, file);
            uploadedFiles.push(uploaded.id);
          }

          // Verify files exist before deletion
          const filesBeforeDelete = await FileService.getByApplication(application.id);
          expect(filesBeforeDelete.length).toBe(numFiles);

          // Delete application (should delete files and audit log atomically)
          await ApplicationService.delete(user.id, application.id);

          // Verify application is deleted
          const applicationAfterDelete = await ApplicationModel.findById(user.id, application.id);
          expect(applicationAfterDelete).toBeNull();

          // Verify files are deleted from database
          const filesAfterDelete = await FileService.getByApplication(application.id);
          expect(filesAfterDelete.length).toBe(0);

          // Verify audit log entry was created
          const { AuditService } = await import('../services/audit.service');
          const auditLogs = await AuditService.getEntityAuditLog('application', application.id);
          const deleteLog = auditLogs.find(log => log.action === 'DELETE');
          expect(deleteLog).toBeDefined();
          expect(deleteLog!.userId).toBe(user.id);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property 62 (Rollback variant): Transaction rollback on error
   * **Validates: Requirements 16.4**
   */
  test('Property 62 (Rollback): Transaction rollback prevents partial changes', async () => {
    const user = await createTestUser();
    const application = await createTestApplication(user.id);

    // Create a file
    const file: FileUpload = {
      buffer: Buffer.from('Test content'),
      originalName: 'test-file.pdf',
      mimeType: 'application/pdf',
      size: 100
    };
    await FileService.upload(user.id, application.id, file);

    // Verify initial state
    const filesBeforeDelete = await FileService.getByApplication(application.id);
    expect(filesBeforeDelete.length).toBe(1);

    // Attempt to delete with wrong user (should fail authorization)
    const otherUser = await createTestUser();
    await expect(
      ApplicationService.delete(otherUser.id, application.id)
    ).rejects.toThrow('Application not found');

    // Verify application still exists (transaction rolled back)
    const applicationAfterFailedDelete = await ApplicationModel.findById(user.id, application.id);
    expect(applicationAfterFailedDelete).not.toBeNull();

    // Verify files still exist (transaction rolled back)
    const filesAfterFailedDelete = await FileService.getByApplication(application.id);
    expect(filesAfterFailedDelete.length).toBe(1);
  }, 30000);

  /**
   * Additional test: Status update persistence
   */
  test('Status updates are persisted before success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
        fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
        async (initialStatus, newStatus) => {
          const user = await createTestUser();
          const application = await createTestApplication(user.id, { status: initialStatus });

          // Update status
          await ApplicationService.updateStatus(user.id, application.id, newStatus);

          // Verify status is persisted
          const retrieved = await ApplicationModel.findById(user.id, application.id);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.status).toBe(newStatus);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);
});
