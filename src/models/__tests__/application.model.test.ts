import { ApplicationModel } from '../application.model';
import { UserModel } from '../user.model';
import { CreateApplicationDTO } from '../../types';

describe('ApplicationModel', () => {
  let testUserId: string;
  let testUserId2: string;

  beforeAll(async () => {
    // Create test users
    const user1 = await UserModel.create(`apptest1-${Date.now()}@example.com`, 'password123');
    const user2 = await UserModel.create(`apptest2-${Date.now()}@example.com`, 'password123');
    testUserId = user1.id;
    testUserId2 = user2.id;
  });

  describe('create', () => {
    it('should create a new application with required fields', async () => {
      const data: CreateApplicationDTO = {
        companyName: 'Test Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15'
      };

      const application = await ApplicationModel.create(testUserId, data);

      expect(application).toBeDefined();
      expect(application.id).toBeDefined();
      expect(application.userId).toBe(testUserId);
      expect(application.companyName).toBe(data.companyName);
      expect(application.position).toBe(data.position);
      expect(application.status).toBe(data.status);
      expect(application.createdAt).toBeDefined();
      expect(application.updatedAt).toBeDefined();
    });

    it('should create application with optional fields', async () => {
      const data: CreateApplicationDTO = {
        companyName: 'Test Company 2',
        position: 'Backend Developer',
        status: 'Interview',
        applicationDate: '2024-01-20',
        notes: 'Great opportunity',
        sourceLink: 'https://example.com/job',
        reminderDate: '2024-02-01'
      };

      const application = await ApplicationModel.create(testUserId, data);

      expect(application.notes).toBe(data.notes);
      expect(application.sourceLink).toBe(data.sourceLink);
      expect(application.reminderDate).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find application by ID for correct user', async () => {
      const data: CreateApplicationDTO = {
        companyName: 'Find Test Company',
        position: 'Developer',
        status: 'Applied',
        applicationDate: '2024-01-15'
      };

      const created = await ApplicationModel.create(testUserId, data);
      const found = await ApplicationModel.findById(testUserId, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.companyName).toBe(data.companyName);
    });

    it('should return null when application belongs to different user', async () => {
      const data: CreateApplicationDTO = {
        companyName: 'User Isolation Test',
        position: 'Developer',
        status: 'Applied',
        applicationDate: '2024-01-15'
      };

      const created = await ApplicationModel.create(testUserId, data);
      const found = await ApplicationModel.findById(testUserId2, created.id);

      expect(found).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const found = await ApplicationModel.findById(testUserId, '00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return only applications for the specified user', async () => {
      // Create applications for user 1
      await ApplicationModel.create(testUserId, {
        companyName: 'Company A',
        position: 'Dev',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      // Create applications for user 2
      await ApplicationModel.create(testUserId2, {
        companyName: 'Company B',
        position: 'Dev',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const result = await ApplicationModel.findAll(testUserId);

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(app => {
        expect(app.userId).toBe(testUserId);
      });
    });

    it('should filter by search term', async () => {
      await ApplicationModel.create(testUserId, {
        companyName: 'Unique Search Company',
        position: 'Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const result = await ApplicationModel.findAll(testUserId, { search: 'Unique Search' });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].companyName).toContain('Unique Search');
    });

    it('should filter by status', async () => {
      await ApplicationModel.create(testUserId, {
        companyName: 'Interview Company',
        position: 'Engineer',
        status: 'Interview',
        applicationDate: '2024-01-15'
      });

      const result = await ApplicationModel.findAll(testUserId, { status: 'Interview' });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(app => {
        expect(app.status).toBe('Interview');
      });
    });

    it('should paginate results', async () => {
      const result = await ApplicationModel.findAll(testUserId, { page: 1, pageSize: 2 });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.totalPages).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update application fields', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Original Company',
        position: 'Original Position',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const updated = await ApplicationModel.update(testUserId, created.id, {
        companyName: 'Updated Company',
        position: 'Updated Position'
      });

      expect(updated).toBeDefined();
      expect(updated?.companyName).toBe('Updated Company');
      expect(updated?.position).toBe('Updated Position');
      expect(updated?.status).toBe('Applied'); // Unchanged
    });

    it('should not update application for different user', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'User Test Company',
        position: 'Position',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const updated = await ApplicationModel.update(testUserId2, created.id, {
        companyName: 'Hacked Company'
      });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete application for correct user', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Delete Test',
        position: 'Position',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const deleted = await ApplicationModel.delete(testUserId, created.id);
      expect(deleted).toBe(true);

      const found = await ApplicationModel.findById(testUserId, created.id);
      expect(found).toBeNull();
    });

    it('should not delete application for different user', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Delete Protection Test',
        position: 'Position',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const deleted = await ApplicationModel.delete(testUserId2, created.id);
      expect(deleted).toBe(false);

      // Verify it still exists
      const found = await ApplicationModel.findById(testUserId, created.id);
      expect(found).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('should update application status', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Status Test Company',
        position: 'Position',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const updated = await ApplicationModel.updateStatus(testUserId, created.id, 'Interview');

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('Interview');
    });
  });

  describe('countByUser', () => {
    it('should count applications for user', async () => {
      const initialCount = await ApplicationModel.countByUser(testUserId);

      await ApplicationModel.create(testUserId, {
        companyName: 'Count Test 1',
        position: 'Position',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      await ApplicationModel.create(testUserId, {
        companyName: 'Count Test 2',
        position: 'Position',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const newCount = await ApplicationModel.countByUser(testUserId);
      expect(newCount).toBe(initialCount + 2);
    });
  });

  describe('countByUserAndStatus', () => {
    it('should count applications by status', async () => {
      const initialCount = await ApplicationModel.countByUserAndStatus(testUserId, 'Offer');

      await ApplicationModel.create(testUserId, {
        companyName: 'Offer Test',
        position: 'Position',
        status: 'Offer',
        applicationDate: '2024-01-15'
      });

      const newCount = await ApplicationModel.countByUserAndStatus(testUserId, 'Offer');
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('getRecentByUser', () => {
    it('should return recent applications', async () => {
      await ApplicationModel.create(testUserId, {
        companyName: 'Recent Test',
        position: 'Position',
        status: 'Applied',
        applicationDate: '2024-01-15'
      });

      const recent = await ApplicationModel.getRecentByUser(testUserId, 7);

      expect(recent.length).toBeGreaterThan(0);
      expect(recent[0].userId).toBe(testUserId);
    });
  });
});
