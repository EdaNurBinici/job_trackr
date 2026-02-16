/**
 * CV Analysis Routes Integration Tests
 * Tests for AI-powered CV analysis endpoints
 * Requirements: 6.1-6.5, 7.1-7.4
 */

import request from 'supertest';
import app from '../../index';
import { pool } from '../../config/database';
import { UserModel } from '../../models';
import { generateToken } from '../../utils/jwt';
import { AIService } from '../../services/ai.service';
import { PDFParserService } from '../../services/pdfParser.service';

// Mock AI Service
jest.mock('../../services/ai.service');

// Mock PDF Parser Service
jest.mock('../../services/pdfParser.service');

// Mock queue configuration to force synchronous processing
jest.mock('../../config/queue', () => ({
  ...jest.requireActual('../../config/queue'),
  isQueueConfigured: jest.fn().mockReturnValue(false),
}));

// Test helpers
const createTestUser = async () => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  return UserModel.create(email, 'password123', 'user');
};

const uploadTestCV = async (token: string) => {
  const pdfBuffer = Buffer.from('%PDF-1.4\nTest CV content\nSkills: JavaScript, Node.js');
  
  const response = await request(app)
    .post('/api/cv/upload')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', pdfBuffer, 'test-cv.pdf');
  
  return response.body.data.id;
};

describe('CV Analysis Routes', () => {
  beforeAll(() => {
    // Mock AI service configuration check
    (AIService.isConfigured as jest.Mock).mockReturnValue(true);
    
    // Mock AI analysis response
    (AIService.analyzeCVMatch as jest.Mock).mockResolvedValue({
      match_score: 75,
      missing_skills: ['React', 'TypeScript'],
      recommendations: [
        'Add React projects to showcase your frontend skills',
        'Highlight TypeScript experience in your projects section'
      ]
    });

    // Mock PDF parser
    (PDFParserService.extractTextFromPDF as jest.Mock).mockResolvedValue(
      'John Doe\nSoftware Engineer\nSkills: JavaScript, Node.js, PostgreSQL\nExperience: 5 years'
    );
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM cv_analyses WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-%@example.com']);
    await pool.query('DELETE FROM cv_files WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-%@example.com']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test-%@example.com']);
    await pool.end();
  });

  describe('POST /api/cv-analysis', () => {
    it('should create CV analysis successfully', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cvFileId = await uploadTestCV(token);

      const jobDescription = 'We are looking for a Full Stack Developer with experience in React, TypeScript, Node.js, and PostgreSQL. Must have 3+ years of experience.';

      const response = await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cvFileId,
          jobDescription,
          jobUrl: 'https://example.com/job/123'
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('matchScore', 75);
      expect(response.body.data).toHaveProperty('missingSkills');
      expect(response.body.data.missingSkills).toEqual(['React', 'TypeScript']);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data.recommendations).toHaveLength(2);
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should reject analysis without authentication', async () => {
      const response = await request(app)
        .post('/api/cv-analysis')
        .send({
          cvFileId: 'some-id',
          jobDescription: 'Test job description with more than fifty characters here'
        });

      expect(response.status).toBe(401);
    });

    it('should reject analysis without CV file ID', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jobDescription: 'Test job description with more than fifty characters here'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('CV file ID is required');
    });

    it('should reject analysis with short job description', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cvFileId = await uploadTestCV(token);

      const response = await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cvFileId,
          jobDescription: 'Too short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('at least 50 characters');
    });

    it('should reject analysis for non-existent CV', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cvFileId: '00000000-0000-0000-0000-000000000000',
          jobDescription: 'Test job description with more than fifty characters here'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject analysis for another user\'s CV', async () => {
      // Create first user and upload CV
      const user1 = await createTestUser();
      const token1 = generateToken(user1);
      const cvFileId = await uploadTestCV(token1);

      // Create second user and try to analyze first user's CV
      const user2 = await createTestUser();
      const token2 = generateToken(user2);

      const response = await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          cvFileId,
          jobDescription: 'Test job description with more than fifty characters here'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/cv-analysis/:id', () => {
    it('should retrieve analysis by ID', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cvFileId = await uploadTestCV(token);

      // Create analysis
      const createResponse = await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cvFileId,
          jobDescription: 'Test job description with more than fifty characters here for testing'
        });

      expect(createResponse.status).toBe(201);
      const analysisId = createResponse.body.data.id;

      // Get analysis
      const response = await request(app)
        .get(`/api/cv-analysis/${analysisId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id', analysisId);
      expect(response.body.data).toHaveProperty('cvFileId', cvFileId);
      expect(response.body.data).toHaveProperty('jobDescription');
      expect(response.body.data).toHaveProperty('matchScore');
      expect(response.body.data).toHaveProperty('missingSkills');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/cv-analysis/some-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent analysis', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .get('/api/cv-analysis/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject access to another user\'s analysis', async () => {
      // Create first user and analysis
      const user1 = await createTestUser();
      const token1 = generateToken(user1);
      const cvFileId = await uploadTestCV(token1);

      const createResponse = await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          cvFileId,
          jobDescription: 'Test job description with more than fifty characters here'
        });

      expect(createResponse.status).toBe(201);
      const analysisId = createResponse.body.data.id;

      // Create second user and try to access first user's analysis
      const user2 = await createTestUser();
      const token2 = generateToken(user2);

      const response = await request(app)
        .get(`/api/cv-analysis/${analysisId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/cv-analysis/user/list', () => {
    it('should list all analyses for authenticated user', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cvFileId = await uploadTestCV(token);

      // Create multiple analyses
      await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cvFileId,
          jobDescription: 'First job description with more than fifty characters here for testing'
        });

      await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cvFileId,
          jobDescription: 'Second job description with more than fifty characters here for testing'
        });

      // List analyses
      const response = await request(app)
        .get('/api/cv-analysis/user/list')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      // Verify structure
      response.body.data.forEach((analysis: any) => {
        expect(analysis).toHaveProperty('id');
        expect(analysis).toHaveProperty('cvFileId');
        expect(analysis).toHaveProperty('matchScore');
        expect(analysis).toHaveProperty('createdAt');
      });

      // Verify ordering (newest first)
      const dates = response.body.data.map((a: any) => new Date(a.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it('should return empty array for user with no analyses', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .get('/api/cv-analysis/user/list')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/cv-analysis/user/list');

      expect(response.status).toBe(401);
    });

    it('should respect limit parameter', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cvFileId = await uploadTestCV(token);

      // Create 3 analyses
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/cv-analysis')
          .set('Authorization', `Bearer ${token}`)
          .send({
            cvFileId,
            jobDescription: `Job description ${i} with more than fifty characters here for testing`
          });
      }

      // List with limit
      const response = await request(app)
        .get('/api/cv-analysis/user/list?limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/cv-analysis/user/stats', () => {
    it('should return user statistics', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cvFileId = await uploadTestCV(token);

      // Create analysis
      await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cvFileId,
          jobDescription: 'Test job description with more than fifty characters here'
        });

      const response = await request(app)
        .get('/api/cv-analysis/user/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalAnalyses');
      expect(response.body.data).toHaveProperty('averageScore');
      expect(response.body.data).toHaveProperty('highestScore');
      expect(response.body.data).toHaveProperty('lowestScore');
      expect(response.body.data.totalAnalyses).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/cv-analysis/user/stats');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/cv-analysis/:id', () => {
    it('should delete analysis successfully', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cvFileId = await uploadTestCV(token);

      // Create analysis
      const createResponse = await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cvFileId,
          jobDescription: 'Test job description with more than fifty characters here'
        });

      expect(createResponse.status).toBe(201);
      const analysisId = createResponse.body.data.id;

      // Delete analysis
      const response = await request(app)
        .delete(`/api/cv-analysis/${analysisId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/cv-analysis/${analysisId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete('/api/cv-analysis/some-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent analysis', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .delete('/api/cv-analysis/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject delete of another user\'s analysis', async () => {
      // Create first user and analysis
      const user1 = await createTestUser();
      const token1 = generateToken(user1);
      const cvFileId = await uploadTestCV(token1);

      const createResponse = await request(app)
        .post('/api/cv-analysis')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          cvFileId,
          jobDescription: 'Test job description with more than fifty characters here'
        });

      expect(createResponse.status).toBe(201);
      const analysisId = createResponse.body.data.id;

      // Create second user and try to delete first user's analysis
      const user2 = await createTestUser();
      const token2 = generateToken(user2);

      const response = await request(app)
        .delete(`/api/cv-analysis/${analysisId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');

      // Verify analysis still exists
      const getResponse = await request(app)
        .get(`/api/cv-analysis/${analysisId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(getResponse.status).toBe(200);
    });
  });
});
