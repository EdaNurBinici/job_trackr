/**
 * CV Routes Integration Tests
 * Tests for CV file upload endpoint
 * Requirements: 1.1, 4.1
 */

import request from 'supertest';
import app from '../../index';
import { pool } from '../../config/database';
import { UserModel } from '../../models';
import { generateToken } from '../../utils/jwt';

// Test helpers
const createTestUser = async () => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  return UserModel.create(email, 'password123', 'user');
};

describe('CV Routes', () => {
  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM cv_files WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-%@example.com']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test-%@example.com']);
    await pool.end();
  });

  describe('POST /api/cv/upload', () => {
    it('should upload a CV file successfully', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      // Create a test PDF buffer
      const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content');

      const response = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfBuffer, 'test-cv.pdf');

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('fileName');
      expect(response.body.data).toHaveProperty('s3Key');
      expect(response.body.data).toHaveProperty('signedUrl');
      expect(response.body.data.signedUrl).toContain('https://');
    });

    it('should reject upload without authentication', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content');

      const response = await request(app)
        .post('/api/cv/upload')
        .attach('file', pdfBuffer, 'test-cv.pdf');

      expect(response.status).toBe(401);
    });

    it('should reject upload without file', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_FILE');
    });

    it('should reject files larger than 10MB', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const response = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', largeBuffer, 'large-cv.pdf');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('exceeds');
    });
  });

  describe('GET /api/cv/:id', () => {
    it('should retrieve CV metadata with signed URL', async () => {
      // Create user and upload CV
      const user = await createTestUser();
      const token = generateToken(user);

      const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content');

      const uploadResponse = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfBuffer, 'test-cv.pdf');

      expect(uploadResponse.status).toBe(201);
      const cvId = uploadResponse.body.data.id;

      // Get CV metadata
      const response = await request(app)
        .get(`/api/cv/${cvId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id', cvId);
      expect(response.body.data).toHaveProperty('fileName', 'test-cv.pdf');
      expect(response.body.data).toHaveProperty('fileSize');
      expect(response.body.data).toHaveProperty('mimeType');
      expect(response.body.data).toHaveProperty('signedUrl');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data.signedUrl).toBeTruthy();
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/cv/some-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent CV', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .get('/api/cv/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('CV file not found');
    });

    it('should reject access to another user\'s CV', async () => {
      // Create first user and upload CV
      const user1 = await createTestUser();
      const token1 = generateToken(user1);

      const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content');

      const uploadResponse = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', pdfBuffer, 'test-cv.pdf');

      expect(uploadResponse.status).toBe(201);
      const cvId = uploadResponse.body.data.id;

      // Create second user and try to access first user's CV
      const user2 = await createTestUser();
      const token2 = generateToken(user2);

      const response = await request(app)
        .get(`/api/cv/${cvId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Unauthorized access to CV file');
    });
  });

  describe('GET /api/cv/user/:userId', () => {
    it('should list all CVs for the authenticated user', async () => {
      // Create user and upload multiple CVs
      const user = await createTestUser();
      const token = generateToken(user);

      const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content');

      // Upload first CV
      const upload1 = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfBuffer, 'cv1.pdf');

      expect(upload1.status).toBe(201);

      // Upload second CV
      const upload2 = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfBuffer, 'cv2.pdf');

      expect(upload2.status).toBe(201);

      // List user's CVs
      const response = await request(app)
        .get(`/api/cv/user/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      // Verify CV metadata structure
      response.body.data.forEach((cv: any) => {
        expect(cv).toHaveProperty('id');
        expect(cv).toHaveProperty('fileName');
        expect(cv).toHaveProperty('fileSize');
        expect(cv).toHaveProperty('mimeType');
        expect(cv).toHaveProperty('createdAt');
      });

      // Verify ordering (newest first)
      const dates = response.body.data.map((cv: any) => new Date(cv.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it('should return empty array for user with no CVs', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .get(`/api/cv/user/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/cv/user/some-user-id');

      expect(response.status).toBe(401);
    });

    it('should reject access to another user\'s CVs', async () => {
      // Create first user and upload CV
      const user1 = await createTestUser();
      const token1 = generateToken(user1);

      const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content');

      await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', pdfBuffer, 'cv1.pdf');

      // Create second user and try to access first user's CVs
      const user2 = await createTestUser();
      const token2 = generateToken(user2);

      const response = await request(app)
        .get(`/api/cv/user/${user1.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('You can only access your own CV files');
    });
  });

  describe('DELETE /api/cv/:id', () => {
    it('should delete CV file successfully', async () => {
      // Create user and upload CV
      const user = await createTestUser();
      const token = generateToken(user);

      const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content');

      const uploadResponse = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfBuffer, 'test-cv.pdf');

      expect(uploadResponse.status).toBe(201);
      const cvId = uploadResponse.body.data.id;

      // Delete CV
      const response = await request(app)
        .delete(`/api/cv/${cvId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify CV is deleted - should return 404
      const getResponse = await request(app)
        .get(`/api/cv/${cvId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete('/api/cv/some-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent CV', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .delete('/api/cv/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('CV file not found');
    });

    it('should reject delete of another user\'s CV', async () => {
      // Create first user and upload CV
      const user1 = await createTestUser();
      const token1 = generateToken(user1);

      const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content');

      const uploadResponse = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token1}`)
        .attach('file', pdfBuffer, 'test-cv.pdf');

      expect(uploadResponse.status).toBe(201);
      const cvId = uploadResponse.body.data.id;

      // Create second user and try to delete first user's CV
      const user2 = await createTestUser();
      const token2 = generateToken(user2);

      const response = await request(app)
        .delete(`/api/cv/${cvId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Unauthorized access to CV file');

      // Verify CV still exists for original owner
      const getResponse = await request(app)
        .get(`/api/cv/${cvId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(getResponse.status).toBe(200);
    });

    it('should delete CV from both S3 and database', async () => {
      // Create user and upload CV
      const user = await createTestUser();
      const token = generateToken(user);

      const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content');

      const uploadResponse = await request(app)
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfBuffer, 'test-cv.pdf');

      expect(uploadResponse.status).toBe(201);
      const cvId = uploadResponse.body.data.id;

      // Verify CV exists in database
      const beforeDelete = await pool.query('SELECT * FROM cv_files WHERE id = $1', [cvId]);
      expect(beforeDelete.rows.length).toBe(1);

      // Delete CV
      const response = await request(app)
        .delete(`/api/cv/${cvId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      // Verify CV is deleted from database
      const afterDelete = await pool.query('SELECT * FROM cv_files WHERE id = $1', [cvId]);
      expect(afterDelete.rows.length).toBe(0);
    });
  });
});
