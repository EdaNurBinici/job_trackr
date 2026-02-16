import fc from 'fast-check';
import { ApplicationService } from '../application.service';
import { pool, testConnection } from '../../config/database';
import { UserModel } from '../../models/user.model';
import { CreateApplicationDTO, ApplicationStatus } from '../../types';
import { randomUUID } from 'crypto';

// Helper to generate non-whitespace strings
const nonWhitespaceString = () => fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0);

describe('Application Validation Property Tests', () => {
  beforeAll(async () => {
    await testConnection();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM applications');
    await pool.query('DELETE FROM audit_log');
    await pool.query('DELETE FROM users');
  });

  /**
   * Feature: job-trackr, Property 8: Missing required fields rejected
   * **Validates: Requirements 2.2**
   */
  describe('Property 8: Missing required fields rejected', () => {
    it('should reject application creation when companyName is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            position: nonWhitespaceString(),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date().map(d => d.toISOString().split('T')[0]),
          }),
          async (data) => {
            const email = `${randomUUID()}@test.com`;
            const user = await UserModel.create(email, 'password123');
            const invalidData = { position: data.position, status: data.status, applicationDate: data.applicationDate } as any; // Missing companyName
            
            await expect(
              ApplicationService.create(user.id, invalidData)
            ).rejects.toThrow('Company name is required');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should reject application creation when position is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            companyName: nonWhitespaceString(),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.date().map(d => d.toISOString().split('T')[0]),
          }),
          async (data) => {
            const email = `${randomUUID()}@test.com`;
            const user = await UserModel.create(email, 'password123');
            const invalidData = { companyName: data.companyName, status: data.status, applicationDate: data.applicationDate } as any; // Missing position
            
            await expect(
              ApplicationService.create(user.id, invalidData)
            ).rejects.toThrow('Position is required');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should reject application creation when status is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            companyName: nonWhitespaceString(),
            position: nonWhitespaceString(),
            applicationDate: fc.date().map(d => d.toISOString().split('T')[0]),
          }),
          async (data) => {
            const email = `${randomUUID()}@test.com`;
            const user = await UserModel.create(email, 'password123');
            const invalidData = { companyName: data.companyName, position: data.position, applicationDate: data.applicationDate } as any; // Missing status
            
            await expect(
              ApplicationService.create(user.id, invalidData)
            ).rejects.toThrow('Status is required');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should reject application creation when applicationDate is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            companyName: nonWhitespaceString(),
            position: nonWhitespaceString(),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
          }),
          async (data) => {
            const email = `${randomUUID()}@test.com`;
            const user = await UserModel.create(email, 'password123');
            const invalidData = { companyName: data.companyName, position: data.position, status: data.status } as any; // Missing applicationDate
            
            await expect(
              ApplicationService.create(user.id, invalidData)
            ).rejects.toThrow('Application date is required');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  /**
   * Feature: job-trackr, Property 14: Invalid status values rejected
   * **Validates: Requirements 3.2**
   */
  describe('Property 14: Invalid status values rejected', () => {
    it('should reject invalid status values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            companyName: nonWhitespaceString(),
            position: nonWhitespaceString(),
            status: fc.string({ minLength: 1 }).filter(s => !['Applied', 'Interview', 'Offer', 'Rejected'].includes(s)),
            applicationDate: fc.date().map(d => d.toISOString().split('T')[0]),
          }),
          async (data) => {
            const email = `${randomUUID()}@test.com`;
            const user = await UserModel.create(email, 'password123');
            
            await expect(
              ApplicationService.create(user.id, { companyName: data.companyName, position: data.position, status: data.status, applicationDate: data.applicationDate } as CreateApplicationDTO)
            ).rejects.toThrow(/Invalid status/);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  /**
   * Feature: job-trackr, Property 47: Date format validated
   * **Validates: Requirements 12.4**
   */
  describe('Property 47: Date format validated', () => {
    it('should reject invalid date formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            companyName: nonWhitespaceString(),
            position: nonWhitespaceString(),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            applicationDate: fc.string({ minLength: 1 }).filter(s => isNaN(new Date(s).getTime())),
          }),
          async (data) => {
            const email = `${randomUUID()}@test.com`;
            const user = await UserModel.create(email, 'password123');
            
            await expect(
              ApplicationService.create(user.id, { companyName: data.companyName, position: data.position, status: data.status, applicationDate: data.applicationDate } as CreateApplicationDTO)
            ).rejects.toThrow(/Invalid date format/);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  /**
   * Feature: job-trackr, Property 48: Status enum validated
   * **Validates: Requirements 12.5**
   */
  describe('Property 48: Status enum validated', () => {
    it('should only accept valid status enum values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            companyName: nonWhitespaceString(),
            position: nonWhitespaceString(),
            status: fc.constantFrom<ApplicationStatus>('Applied', 'Interview', 'Offer', 'Rejected'),
            // Use a constrained date range to avoid PostgreSQL date range issues
            applicationDate: fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') }).map(d => d.toISOString().split('T')[0]),
          }),
          async (data) => {
            const email = `${randomUUID()}@test.com`;
            const user = await UserModel.create(email, 'password123');
            
            // This should succeed with valid status
            const application = await ApplicationService.create(user.id, { companyName: data.companyName, position: data.position, status: data.status, applicationDate: data.applicationDate });
            expect(['Applied', 'Interview', 'Offer', 'Rejected']).toContain(application.status);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
