import request from 'supertest';
import app from '../../index';
import { UserModel, ApplicationModel } from '../../models';
import { pool } from '../../config/database';
import { generateToken } from '../../utils/jwt';

/**
 * Integration tests for Application API endpoints
 * Feature: job-trackr
 */

describe('Application Routes', () => {
  let testUserId: string;
  let testUserEmail: string;
  let authToken: string;

  beforeAll(async () => {
    // Create a test user
    const timestamp = Date.now();
    testUserEmail = `app-routes-test-${timestamp}@test.com`;
    
    const user = await UserModel.create(testUserEmail, 'password123');
    testUserId = user.id;
    authToken = generateToken(user);
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

  describe('POST /api/applications', () => {
    it('should create a new application with valid data', async () => {
      const applicationData = {
        companyName: 'Test Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15',
        notes: 'Test notes',
      };

      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(applicationData)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.companyName).toBe(applicationData.companyName);
      expect(response.body.data.position).toBe(applicationData.position);
      expect(response.body.data.status).toBe(applicationData.status);
      expect(response.body.data.userId).toBe(testUserId);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        companyName: 'Test Company',
        // missing position, status, applicationDate
      };

      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      const applicationData = {
        companyName: 'Test Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15',
      };

      await request(app)
        .post('/api/applications')
        .send(applicationData)
        .expect(401);
    });
  });

  describe('GET /api/applications', () => {
    it('should return all applications for the authenticated user', async () => {
      // Create test applications
      await ApplicationModel.create(testUserId, {
        companyName: 'Company A',
        position: 'Position A',
        status: 'Applied',
        applicationDate: '2024-01-15',
      });

      await ApplicationModel.create(testUserId, {
        companyName: 'Company B',
        position: 'Position B',
        status: 'Interview',
        applicationDate: '2024-01-16',
      });

      const response = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.data.length).toBe(2);
      expect(response.body.data.total).toBe(2);
    });

    it('should filter applications by status', async () => {
      await ApplicationModel.create(testUserId, {
        companyName: 'Company A',
        position: 'Position A',
        status: 'Applied',
        applicationDate: '2024-01-15',
      });

      await ApplicationModel.create(testUserId, {
        companyName: 'Company B',
        position: 'Position B',
        status: 'Interview',
        applicationDate: '2024-01-16',
      });

      const response = await request(app)
        .get('/api/applications?status=Interview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.data.length).toBe(1);
      expect(response.body.data.data[0].status).toBe('Interview');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/applications')
        .expect(401);
    });
  });

  describe('GET /api/applications/:id', () => {
    it('should return a specific application', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Test Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15',
      });

      const response = await request(app)
        .get(`/api/applications/${created.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(created.id);
      expect(response.body.data.companyName).toBe('Test Company');
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/applications/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/applications/:id', () => {
    it('should update an application', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Test Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15',
      });

      const updateData = {
        companyName: 'Updated Company',
        notes: 'Updated notes',
      };

      const response = await request(app)
        .put(`/api/applications/${created.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.companyName).toBe('Updated Company');
      expect(response.body.data.notes).toBe('Updated notes');
      expect(response.body.data.position).toBe('Software Engineer'); // unchanged
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .put(`/api/applications/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/applications/:id', () => {
    it('should delete an application', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Test Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15',
      });

      await request(app)
        .delete(`/api/applications/${created.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify it's deleted
      const result = await ApplicationModel.findById(testUserId, created.id);
      expect(result).toBeNull();
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .delete(`/api/applications/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/applications/:id/status', () => {
    it('should update application status', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Test Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15',
      });

      const response = await request(app)
        .patch(`/api/applications/${created.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'Interview' })
        .expect(200);

      expect(response.body.data.status).toBe('Interview');
      expect(response.body.data.companyName).toBe('Test Company'); // unchanged
    });

    it('should return 400 for invalid status', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Test Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15',
      });

      await request(app)
        .patch(`/api/applications/${created.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'InvalidStatus' })
        .expect(400);
    });

    it('should return 400 when status is missing', async () => {
      const created = await ApplicationModel.create(testUserId, {
        companyName: 'Test Company',
        position: 'Software Engineer',
        status: 'Applied',
        applicationDate: '2024-01-15',
      });

      await request(app)
        .patch(`/api/applications/${created.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });
});
