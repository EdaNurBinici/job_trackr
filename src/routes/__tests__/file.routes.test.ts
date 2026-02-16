/**
 * File Routes Integration Tests
 * Tests for file download endpoint with signed URLs
 * Requirements: 1.3
 */

import request from 'supertest';
import app from '../../index';
import { pool } from '../../config/database';
import { UserModel, ApplicationModel } from '../../models';
import { generateToken } from '../../utils/jwt';

// Test helpers
const createTestUser = async () => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  return UserModel.create(email, 'password123', 'user');
};

const createTestApplication = async (userId: string) => {
  return ApplicationModel.create(userId, {
    companyName: 'Test Company',
    position: 'Test Position',
    status: 'Applied',
    applicationDate: new Date().toISOString().split('T')[0],
  });
};

describe('File Routes - Signed URL', () => {
  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    await pool.query('DELETE FROM audit_log WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-%@example.com']);
    await pool.query('DELETE FROM files WHERE application_id IN (SELECT id FROM applications WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['test-%@example.com']);
    await pool.query('DELETE FROM applications WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-%@example.com']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test-%@example.com']);
    await pool.end();
  });

  describe('GET /api/files/:id', () => {
    it('should return signed URL for file download', async () => {
      // Create user and application
      const user = await createTestUser();
      const token = generateToken(user);
      const application = await createTestApplication(user.id);

      // Upload a file
      const pdfBuffer = Buffer.from('%PDF-1.4\nTest file content');

      const uploadResponse = await request(app)
        .post(`/api/applications/${application.id}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfBuffer, 'test-file.pdf');

      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Get file download URL
      const response = await request(app)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data).toHaveProperty('fileName');
      
      // Verify it's a URL (S3 signed URL in production, local URL in development)
      expect(response.body.data.url).toMatch(/^https?:\/\//);
      
      // If S3 is configured, verify it's a signed URL with AWS signature parameters
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        expect(response.body.data.url).toContain('https://');
        expect(response.body.data.url).toContain('X-Amz-Algorithm');
        expect(response.body.data.url).toContain('X-Amz-Credential');
        expect(response.body.data.url).toContain('X-Amz-Signature');
      }
      
      // Verify fileName is returned
      expect(response.body.data.fileName).toBe('test-file.pdf');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/files/some-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent file', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .get('/api/files/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
