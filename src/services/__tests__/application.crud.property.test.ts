import fc from 'fast-check';
import { ApplicationService } from '../application.service';
import { UserModel } from '../../models';
import { pool } from '../../config/database';
import { CreateApplicationDTO, UpdateApplicationDTO, ApplicationStatus } from '../../types';

/**
 * Property-Based Tests for Application CRUD Operations
 * Feature: job-trackr
 */

describe('Application CRUD - Property-Based Tests', () => {
  let testUser1Id: string;
  let testUser2Id: string;
  let testUser1Email: string;
  let testUser2Email: string;

  beforeAll(async () => {
    // Create two test users for isolation testing with unique emails
    const timestamp = Date.now();
    testUser1Email = `app-pbt-user1-${timestamp}@pbt-test.com`;
    testUser2Email = `app-pbt-user2-${timestamp}@pbt-test.com`;
    
    const user1 = await UserModel.create(testUser1Email, 'password123');
    const user2 = await UserModel.create(testUser2Email, 'password123');
    testUser1Id = user1.id;
    testUser2Id = user2.id;
  });

  afterEach(async () => {
    // Clean up test applications and audit logs
    await pool.query('DELETE FROM audit_log WHERE user_id IN ($1, $2)', [testUser1Id, testUser2Id]);
    await pool.query('DELETE FROM applications WHERE user_id IN ($1, $2)', [testUser1Id, testUser2Id]);
  });

  afterAll(async () => {
    // Clean up test applications and audit logs first (due to foreign key)
    await pool.query('DELETE FROM audit_log WHERE user_id IN ($1, $2)', [testUser1Id, testUser2Id]);
    await pool.query('DELETE FROM applications WHERE user_id IN ($1, $2)', [testUser1Id, testUser2Id]);
    // Clean up test users
    await UserModel.delete(testUser1Id);
    await UserModel.delete(testUser2Id);
  });

  /**
   * Property 7: Valid application creation persists data
   * **Validates: Requirements 2.1**
   * 
   * For any valid application data (with required fields: company name, position, status, date),
   * creating an application should store it in the database associated with the user.
   */
  test(
    'Property 7: Valid application creation persists data',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid application data
          fc.record({
            companyName: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            position: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().split('T')[0]), // Convert to YYYY-MM-DD format
            notes: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
            sourceLink: fc.option(fc.webUrl(), { nil: undefined }),
            reminderDate: fc.option(
              fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]),
              { nil: undefined }
            )
          }),
          async (applicationData: CreateApplicationDTO) => {
            // Create the application
            const created = await ApplicationService.create(testUser1Id, applicationData);

            // Verify application was created with correct properties
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();
            expect(created.userId).toBe(testUser1Id);
            expect(created.companyName).toBe(applicationData.companyName);
            expect(created.position).toBe(applicationData.position);
            expect(created.status).toBe(applicationData.status);
            expect(created.applicationDate).toBe(applicationData.applicationDate);
            expect(created.notes).toBe(applicationData.notes || null);
            expect(created.sourceLink).toBe(applicationData.sourceLink || null);
            expect(created.reminderDate).toBe(applicationData.reminderDate || null);
            expect(created.createdAt).toBeDefined();
            expect(created.updatedAt).toBeDefined();

            // Verify application can be retrieved from database
            const retrieved = await ApplicationService.getById(testUser1Id, created.id);
            expect(retrieved).toBeDefined();
            expect(retrieved.id).toBe(created.id);
            expect(retrieved.companyName).toBe(applicationData.companyName);
            expect(retrieved.position).toBe(applicationData.position);
            expect(retrieved.status).toBe(applicationData.status);
            expect(retrieved.applicationDate).toBe(applicationData.applicationDate);
            expect(retrieved.notes).toBe(applicationData.notes || null);
            expect(retrieved.sourceLink).toBe(applicationData.sourceLink || null);
            expect(retrieved.reminderDate).toBe(applicationData.reminderDate || null);

            // Clean up
            await ApplicationService.delete(testUser1Id, created.id);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000 // 60 second timeout for property-based test with 100 runs
  );

  /**
   * Property 9: Application updates preserve changes
   * **Validates: Requirements 2.3**
   * 
   * For any existing application and valid update data, updating the application
   * should persist the changes and update the modification timestamp.
   */
  test(
    'Property 9: Application updates preserve changes',
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
          // Generate update data (partial updates)
          fc.record({
            companyName: fc.option(fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/), { nil: undefined }),
            position: fc.option(fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 ]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/), { nil: undefined }),
            status: fc.option(fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'), { nil: undefined }),
            notes: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined })
          }),
          async (initialData: CreateApplicationDTO, updateData: UpdateApplicationDTO) => {
            // Create initial application
            const created = await ApplicationService.create(testUser1Id, initialData);
            const originalUpdatedAt = created.updatedAt;

            // Wait a tiny bit to ensure timestamp changes
            await new Promise(resolve => setTimeout(resolve, 10));

            // Update the application
            const updated = await ApplicationService.update(testUser1Id, created.id, updateData);

            // Verify updates were applied
            expect(updated).toBeDefined();
            expect(updated.id).toBe(created.id);
            expect(updated.userId).toBe(testUser1Id);

            // Check updated fields
            if (updateData.companyName !== undefined) {
              expect(updated.companyName).toBe(updateData.companyName);
            } else {
              expect(updated.companyName).toBe(initialData.companyName);
            }

            if (updateData.position !== undefined) {
              expect(updated.position).toBe(updateData.position);
            } else {
              expect(updated.position).toBe(initialData.position);
            }

            if (updateData.status !== undefined) {
              expect(updated.status).toBe(updateData.status);
            } else {
              expect(updated.status).toBe(initialData.status);
            }

            if (updateData.notes !== undefined) {
              expect(updated.notes).toBe(updateData.notes);
            }

            // Verify timestamp was updated
            expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
              new Date(originalUpdatedAt).getTime()
            );

            // Verify changes persist when retrieved again
            const retrieved = await ApplicationService.getById(testUser1Id, updated.id);
            expect(retrieved.companyName).toBe(updated.companyName);
            expect(retrieved.position).toBe(updated.position);
            expect(retrieved.status).toBe(updated.status);
            expect(retrieved.notes).toBe(updated.notes);

            // Clean up
            await ApplicationService.delete(testUser1Id, created.id);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000 // 60 second timeout
  );

  /**
   * Property 11: User data isolation
   * **Validates: Requirements 2.5, 13.1**
   * 
   * For any two different users, each user should only be able to retrieve their own
   * applications, not applications belonging to other users.
   */
  test(
    'Property 11: User data isolation',
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
            const user1App = await ApplicationService.create(testUser1Id, user1Data);
            expect(user1App.userId).toBe(testUser1Id);

            // Create application for user 2
            const user2App = await ApplicationService.create(testUser2Id, user2Data);
            expect(user2App.userId).toBe(testUser2Id);

            // User 1 should be able to retrieve their own application
            const user1Retrieved = await ApplicationService.getById(testUser1Id, user1App.id);
            expect(user1Retrieved).toBeDefined();
            expect(user1Retrieved.id).toBe(user1App.id);
            expect(user1Retrieved.userId).toBe(testUser1Id);

            // User 1 should NOT be able to retrieve user 2's application
            await expect(
              ApplicationService.getById(testUser1Id, user2App.id)
            ).rejects.toThrow('Application not found');

            // User 2 should be able to retrieve their own application
            const user2Retrieved = await ApplicationService.getById(testUser2Id, user2App.id);
            expect(user2Retrieved).toBeDefined();
            expect(user2Retrieved.id).toBe(user2App.id);
            expect(user2Retrieved.userId).toBe(testUser2Id);

            // User 2 should NOT be able to retrieve user 1's application
            await expect(
              ApplicationService.getById(testUser2Id, user1App.id)
            ).rejects.toThrow('Application not found');

            // User 1's getAll should only return their applications
            const user1List = await ApplicationService.getAll(testUser1Id);
            expect(user1List.data.every(app => app.userId === testUser1Id)).toBe(true);
            expect(user1List.data.some(app => app.id === user1App.id)).toBe(true);
            expect(user1List.data.some(app => app.id === user2App.id)).toBe(false);

            // User 2's getAll should only return their applications
            const user2List = await ApplicationService.getAll(testUser2Id);
            expect(user2List.data.every(app => app.userId === testUser2Id)).toBe(true);
            expect(user2List.data.some(app => app.id === user2App.id)).toBe(true);
            expect(user2List.data.some(app => app.id === user1App.id)).toBe(false);

            // User 1 should NOT be able to update user 2's application
            await expect(
              ApplicationService.update(testUser1Id, user2App.id, { notes: 'Hacked!' })
            ).rejects.toThrow('Application not found');

            // User 2 should NOT be able to delete user 1's application
            await expect(
              ApplicationService.delete(testUser2Id, user1App.id)
            ).rejects.toThrow('Application not found');

            // Verify applications still exist for their respective owners
            const user1StillExists = await ApplicationService.getById(testUser1Id, user1App.id);
            expect(user1StillExists).toBeDefined();

            const user2StillExists = await ApplicationService.getById(testUser2Id, user2App.id);
            expect(user2StillExists).toBeDefined();

            // Clean up
            await ApplicationService.delete(testUser1Id, user1App.id);
            await ApplicationService.delete(testUser2Id, user2App.id);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000 // 60 second timeout
  );
});
