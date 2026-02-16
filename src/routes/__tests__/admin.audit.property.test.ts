import fc from 'fast-check';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models';
import { ApplicationService } from '../../services';
import { pool } from '../../config/database';
import { generateToken } from '../../utils/jwt';
import { CreateApplicationDTO, ApplicationStatus } from '../../types';

/**
 * Property-Based Tests for Admin Audit Log Access
 * Feature: job-trackr
 */

describe('Admin Audit Log - Property-Based Tests', () => {
  let adminUserId: string;
  let regularUserId: string;
  let adminUserEmail: string;
  let regularUserEmail: string;
  let adminToken: string;
  let regularToken: string;

  beforeAll(async () => {
    // Create an admin user and a regular user
    const timestamp = Date.now();
    adminUserEmail = `admin-audit-${timestamp}@pbt-test.com`;
    regularUserEmail = `regular-audit-${timestamp}@pbt-test.com`;
    
    const adminUser = await UserModel.create(adminUserEmail, 'password123', 'admin');
    const regularUser = await UserModel.create(regularUserEmail, 'password123', 'user');
    adminUserId = adminUser.id;
    regularUserId = regularUser.id;
    adminToken = generateToken(adminUser);
    regularToken = generateToken(regularUser);
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM audit_log WHERE user_id IN ($1, $2)', [adminUserId, regularUserId]);
    await pool.query('DELETE FROM applications WHERE user_id IN ($1, $2)', [adminUserId, regularUserId]);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM audit_log WHERE user_id IN ($1, $2)', [adminUserId, regularUserId]);
    await pool.query('DELETE FROM applications WHERE user_id IN ($1, $2)', [adminUserId, regularUserId]);
    await UserModel.delete(adminUserId);
    await UserModel.delete(regularUserId);
  });

  /**
   * Property 43: Audit log complete and accessible
   * **Validates: Requirements 11.4**
   * 
   * For any admin user, the audit log should display all logged actions with
   * user, entity, action type, and timestamp.
   */
  test(
    'Property 43: Audit log complete and accessible',
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
            notes: fc.string({ maxLength: 500 })
          }),
          // Generate update data
          fc.record({
            notes: fc.string({ maxLength: 500 })
          }),
          async (createData: CreateApplicationDTO, updateData: { notes: string }) => {
            // Perform operations that should be logged using ApplicationService
            // CREATE operation
            const created = await ApplicationService.create(regularUserId, createData);
            
            // UPDATE operation
            await ApplicationService.update(regularUserId, created.id, updateData);
            
            // DELETE operation
            await ApplicationService.delete(regularUserId, created.id);

            // Admin should be able to access audit log
            const adminResponse = await request(app)
              .get('/api/admin/audit')
              .set('Authorization', `Bearer ${adminToken}`)
              .query({ entityId: created.id });

            expect(adminResponse.status).toBe(200);
            expect(adminResponse.body.data).toBeDefined();
            expect(adminResponse.body.data.data).toBeInstanceOf(Array);

            const auditEntries = adminResponse.body.data.data;

            // Verify all three operations are logged
            const createEntry = auditEntries.find((entry: any) => 
              entry.action === 'CREATE' && entry.entityId === created.id
            );
            const updateEntry = auditEntries.find((entry: any) => 
              entry.action === 'UPDATE' && entry.entityId === created.id
            );
            const deleteEntry = auditEntries.find((entry: any) => 
              entry.action === 'DELETE' && entry.entityId === created.id
            );

            // Verify CREATE entry
            expect(createEntry).toBeDefined();
            expect(createEntry.userId).toBe(regularUserId);
            expect(createEntry.entity).toBe('application');
            expect(createEntry.entityId).toBe(created.id);
            expect(createEntry.action).toBe('CREATE');
            expect(createEntry.timestamp).toBeDefined();
            expect(createEntry.afterData).toBeDefined();

            // Verify UPDATE entry
            expect(updateEntry).toBeDefined();
            expect(updateEntry.userId).toBe(regularUserId);
            expect(updateEntry.entity).toBe('application');
            expect(updateEntry.entityId).toBe(created.id);
            expect(updateEntry.action).toBe('UPDATE');
            expect(updateEntry.timestamp).toBeDefined();
            expect(updateEntry.beforeData).toBeDefined();
            expect(updateEntry.afterData).toBeDefined();

            // Verify DELETE entry
            expect(deleteEntry).toBeDefined();
            expect(deleteEntry.userId).toBe(regularUserId);
            expect(deleteEntry.entity).toBe('application');
            expect(deleteEntry.entityId).toBe(created.id);
            expect(deleteEntry.action).toBe('DELETE');
            expect(deleteEntry.timestamp).toBeDefined();
            expect(deleteEntry.beforeData).toBeDefined();

            // Regular user should NOT be able to access audit log
            const regularResponse = await request(app)
              .get('/api/admin/audit')
              .set('Authorization', `Bearer ${regularToken}`);

            expect(regularResponse.status).toBe(403);
            expect(regularResponse.body.error).toBeDefined();
            expect(regularResponse.body.error.code).toBe('FORBIDDEN');
            expect(regularResponse.body.error.message).toBe('Admin access required');

            // Test filtering by user
            const userFilterResponse = await request(app)
              .get('/api/admin/audit')
              .set('Authorization', `Bearer ${adminToken}`)
              .query({ userId: regularUserId });

            expect(userFilterResponse.status).toBe(200);
            expect(userFilterResponse.body.data.data).toBeInstanceOf(Array);
            expect(userFilterResponse.body.data.data.every((entry: any) => 
              entry.userId === regularUserId
            )).toBe(true);

            // Test filtering by entity
            const entityFilterResponse = await request(app)
              .get('/api/admin/audit')
              .set('Authorization', `Bearer ${adminToken}`)
              .query({ entity: 'application' });

            expect(entityFilterResponse.status).toBe(200);
            expect(entityFilterResponse.body.data.data).toBeInstanceOf(Array);
            expect(entityFilterResponse.body.data.data.every((entry: any) => 
              entry.entity === 'application'
            )).toBe(true);

            // Test filtering by action
            const actionFilterResponse = await request(app)
              .get('/api/admin/audit')
              .set('Authorization', `Bearer ${adminToken}`)
              .query({ action: 'CREATE' });

            expect(actionFilterResponse.status).toBe(200);
            expect(actionFilterResponse.body.data.data).toBeInstanceOf(Array);
            expect(actionFilterResponse.body.data.data.every((entry: any) => 
              entry.action === 'CREATE'
            )).toBe(true);

            // Test pagination
            const paginatedResponse = await request(app)
              .get('/api/admin/audit')
              .set('Authorization', `Bearer ${adminToken}`)
              .query({ page: 1, pageSize: 10 });

            expect(paginatedResponse.status).toBe(200);
            expect(paginatedResponse.body.data.page).toBe(1);
            expect(paginatedResponse.body.data.pageSize).toBe(10);
            expect(paginatedResponse.body.data.total).toBeDefined();
            expect(paginatedResponse.body.data.totalPages).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    },
    60000
  );
});
