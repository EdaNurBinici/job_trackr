import { ApplicationService } from '../application.service';
import { UserModel } from '../../models';
import { CreateApplicationDTO } from '../../types';

describe('ApplicationService', () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await UserModel.create(`appservice-${Date.now()}@example.com`, 'password123');
    testUserId = user.id;
  });

  describe('Validation', () => {
    it('should reject application with missing company name', async () => {
      const data = {
        position: 'Developer',
        status: 'Applied',
        applicationDate: '2024-01-15'
      } as CreateApplicationDTO;

      await expect(ApplicationService.create(testUserId, data)).rejects.toThrow('Company name is required');
    });

    it('should reject application with empty company name', async () => {
      const data: CreateApplicationDTO = {
        companyName: '   ',
        position: 'Developer',
        status: 'Applied',
        applicationDate: '2024-01-15'
      };

      await expect(ApplicationService.create(testUserId, data)).rejects.toThrow('Company name is required');
    });

    it('should reject application with missing position', async () => {
      const data = {
        companyName: 'Test Company',
        status: 'Applied',
        applicationDate: '2024-01-15'
      } as CreateApplicationDTO;

      await expect(ApplicationService.create(testUserId, data)).rejects.toThrow('Position is required');
    });

    it('should reject application with invalid status', async () => {
      const data: CreateApplicationDTO = {
        companyName: 'Test Company',
        position: 'Developer',
        status: 'InvalidStatus' as any,
        applicationDate: '2024-01-15'
      };

      await expect(ApplicationService.create(testUserId, data)).rejects.toThrow('Invalid status');
    });

    it('should reject application with invalid date format', async () => {
      const data: CreateApplicationDTO = {
        companyName: 'Test Company',
        position: 'Developer',
        status: 'Applied',
        applicationDate: 'not-a-date'
      };

      await expect(ApplicationService.create(testUserId, data)).rejects.toThrow('Invalid date format');
    });

    it('should accept valid application data', async () => {
      const data: CreateApplicationDTO = {
        companyName: 'Valid Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15'
      };

      const application = await ApplicationService.create(testUserId, data);

      expect(application).toBeDefined();
      expect(application.companyName).toBe(data.companyName);
    });
  });

  describe('CRUD Operations', () => {
    it('should create and retrieve application', async () => {
      const data: CreateApplicationDTO = {
        companyName: 'CRUD Test Company',
        position: 'Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15'
      };

      const created = await ApplicationService.create(testUserId, data);
      const retrieved = await ApplicationService.getById(testUserId, created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.companyName).toBe(data.companyName);
    });

    it('should throw error when getting non-existent application', async () => {
      await expect(
        ApplicationService.getById(testUserId, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Application not found');
    });

    it('should update application', async () => {
      const created = await ApplicationService.create(testUserId, {
        companyName: 'Original',
        position: 'Dev',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const updated = await ApplicationService.update(testUserId, created.id, {
        companyName: 'Updated'
      });

      expect(updated.companyName).toBe('Updated');
      expect(updated.position).toBe('Dev'); // Unchanged
    });

    it('should reject update with invalid status', async () => {
      const created = await ApplicationService.create(testUserId, {
        companyName: 'Test',
        position: 'Dev',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      await expect(
        ApplicationService.update(testUserId, created.id, { status: 'InvalidStatus' as any })
      ).rejects.toThrow('Invalid status');
    });

    it('should delete application', async () => {
      const created = await ApplicationService.create(testUserId, {
        companyName: 'Delete Test',
        position: 'Dev',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      await ApplicationService.delete(testUserId, created.id);

      await expect(
        ApplicationService.getById(testUserId, created.id)
      ).rejects.toThrow('Application not found');
    });

    it('should update status', async () => {
      const created = await ApplicationService.create(testUserId, {
        companyName: 'Status Test',
        position: 'Dev',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const updated = await ApplicationService.updateStatus(testUserId, created.id, 'Interview');

      expect(updated.status).toBe('Interview');
    });
  });

  describe('Statistics', () => {
    it('should calculate user statistics', async () => {
      // Create applications with different statuses
      await ApplicationService.create(testUserId, {
        companyName: 'Stats Test 1',
        position: 'Dev',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      await ApplicationService.create(testUserId, {
        companyName: 'Stats Test 2',
        position: 'Dev',
        status: 'Interview',
        applicationDate: '2024-01-15'
      });

      await ApplicationService.create(testUserId, {
        companyName: 'Stats Test 3',
        position: 'Dev',
        status: 'Offer',
        applicationDate: '2024-01-15'
      });

      const stats = await ApplicationService.getUserStats(testUserId);

      expect(stats.totalApplications).toBeGreaterThanOrEqual(3);
      expect(stats.interviewCount).toBeGreaterThanOrEqual(1);
      expect(stats.offerCount).toBeGreaterThanOrEqual(1);
    });

    it('should get recent activity', async () => {
      await ApplicationService.create(testUserId, {
        companyName: 'Recent Activity Test',
        position: 'Dev',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const activity = await ApplicationService.getRecentActivity(testUserId, 7);

      expect(activity.length).toBeGreaterThan(0);
      expect(activity[0].userId).toBe(testUserId);
    });
  });

  describe('Filtering', () => {
    it('should filter applications', async () => {
      await ApplicationService.create(testUserId, {
        companyName: 'Filter Test Company',
        position: 'Dev',
        status: 'Interview',
        applicationDate: '2024-01-15'
      });

      const result = await ApplicationService.getAll(testUserId, {
        status: 'Interview',
        search: 'Filter Test'
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(app => {
        expect(app.status).toBe('Interview');
      });
    });

    it('should reject invalid status filter', async () => {
      await expect(
        ApplicationService.getAll(testUserId, { status: 'InvalidStatus' as any })
      ).rejects.toThrow('Invalid status');
    });
  });
});
