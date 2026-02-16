import { CVAnalysisModel, CreateCVAnalysisDTO } from '../cvAnalysis.model';
import { UserModel } from '../user.model';
import { CVFileModel } from '../cvFile.model';
import { pool } from '../../config/database';

describe('CVAnalysisModel', () => {
  let testUserId: string;
  let testUserId2: string;
  let testCVFileId: string;
  let testCVFileId2: string;

  beforeAll(async () => {
    // Create test users
    const user1 = await UserModel.create(`cvanalysis1-${Date.now()}@example.com`, 'password123');
    const user2 = await UserModel.create(`cvanalysis2-${Date.now()}@example.com`, 'password123');
    testUserId = user1.id;
    testUserId2 = user2.id;

    // Create test CV files
    const cvFile1 = await CVFileModel.create({
      userId: testUserId,
      fileName: 'test-cv-1.pdf',
      originalName: 'resume-1.pdf',
      s3Key: `${testUserId}/test-cv-1.pdf`,
      fileSize: 500000,
      mimeType: 'application/pdf'
    });

    const cvFile2 = await CVFileModel.create({
      userId: testUserId2,
      fileName: 'test-cv-2.pdf',
      originalName: 'resume-2.pdf',
      s3Key: `${testUserId2}/test-cv-2.pdf`,
      fileSize: 600000,
      mimeType: 'application/pdf'
    });

    testCVFileId = cvFile1.id;
    testCVFileId2 = cvFile2.id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM cv_analyses WHERE user_id = $1 OR user_id = $2', [testUserId, testUserId2]);
    await pool.query('DELETE FROM cv_files WHERE user_id = $1 OR user_id = $2', [testUserId, testUserId2]);
    await pool.query('DELETE FROM users WHERE id = $1 OR id = $2', [testUserId, testUserId2]);
  });

  describe('create', () => {
    it('should create a new CV analysis with all required fields', async () => {
      const data: CreateCVAnalysisDTO = {
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Looking for a senior developer with React and TypeScript experience',
        jobUrl: 'https://example.com/job/123',
        matchScore: 75,
        missingSkills: ['React', 'TypeScript'],
        recommendations: ['Add React projects to portfolio', 'Highlight TypeScript experience']
      };

      const analysis = await CVAnalysisModel.create(data);

      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.userId).toBe(testUserId);
      expect(analysis.cvFileId).toBe(testCVFileId);
      expect(analysis.jobDescription).toBe(data.jobDescription);
      expect(analysis.jobUrl).toBe(data.jobUrl);
      expect(analysis.matchScore).toBe(75);
      expect(analysis.missingSkills).toEqual(['React', 'TypeScript']);
      expect(analysis.recommendations).toEqual(data.recommendations);
      expect(analysis.createdAt).toBeDefined();
      expect(analysis.updatedAt).toBeDefined();
    });

    it('should create analysis without optional jobUrl', async () => {
      const data: CreateCVAnalysisDTO = {
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Backend developer position',
        matchScore: 80,
        missingSkills: ['Docker'],
        recommendations: ['Learn Docker']
      };

      const analysis = await CVAnalysisModel.create(data);

      expect(analysis).toBeDefined();
      expect(analysis.jobUrl).toBeNull();
    });

    it('should create analysis with AI response', async () => {
      const aiResponse = {
        model: 'gpt-4',
        tokens: 500,
        rawResponse: 'Full AI analysis...'
      };

      const data: CreateCVAnalysisDTO = {
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Full stack developer',
        matchScore: 85,
        missingSkills: [],
        recommendations: ['Great match!'],
        aiResponse
      };

      const analysis = await CVAnalysisModel.create(data);

      expect(analysis.aiResponse).toEqual(aiResponse);
    });

    it('should enforce match score constraints (0-100)', async () => {
      const data: CreateCVAnalysisDTO = {
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Test job',
        matchScore: 150, // Invalid score
        missingSkills: [],
        recommendations: []
      };

      await expect(CVAnalysisModel.create(data)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find analysis by ID', async () => {
      const data: CreateCVAnalysisDTO = {
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Find by ID test',
        matchScore: 70,
        missingSkills: ['Skill1'],
        recommendations: ['Recommendation1']
      };

      const created = await CVAnalysisModel.create(data);
      const found = await CVAnalysisModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.userId).toBe(testUserId);
      expect(found?.matchScore).toBe(70);
    });

    it('should return null for non-existent ID', async () => {
      const found = await CVAnalysisModel.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('should return all analyses for a user', async () => {
      // Create multiple analyses
      await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Job 1',
        matchScore: 75,
        missingSkills: [],
        recommendations: []
      });

      await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Job 2',
        matchScore: 80,
        missingSkills: [],
        recommendations: []
      });

      const analyses = await CVAnalysisModel.findByUser(testUserId);

      expect(analyses.length).toBeGreaterThanOrEqual(2);
      analyses.forEach(analysis => {
        expect(analysis.userId).toBe(testUserId);
      });
    });

    it('should return only analyses for the specified user', async () => {
      await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'User 1 job',
        matchScore: 75,
        missingSkills: [],
        recommendations: []
      });

      await CVAnalysisModel.create({
        userId: testUserId2,
        cvFileId: testCVFileId2,
        jobDescription: 'User 2 job',
        matchScore: 80,
        missingSkills: [],
        recommendations: []
      });

      const user1Analyses = await CVAnalysisModel.findByUser(testUserId);
      const user2Analyses = await CVAnalysisModel.findByUser(testUserId2);

      expect(user1Analyses.length).toBeGreaterThan(0);
      expect(user2Analyses.length).toBeGreaterThan(0);

      user1Analyses.forEach(analysis => {
        expect(analysis.userId).toBe(testUserId);
      });

      user2Analyses.forEach(analysis => {
        expect(analysis.userId).toBe(testUserId2);
      });
    });

    it('should return analyses ordered by creation date (newest first)', async () => {
      const analysis1 = await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Old analysis',
        matchScore: 70,
        missingSkills: [],
        recommendations: []
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const analysis2 = await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'New analysis',
        matchScore: 80,
        missingSkills: [],
        recommendations: []
      });

      const analyses = await CVAnalysisModel.findByUser(testUserId);
      const testAnalyses = analyses.filter(a => a.id === analysis1.id || a.id === analysis2.id);

      expect(testAnalyses.length).toBe(2);
      const newerIndex = testAnalyses.findIndex(a => a.id === analysis2.id);
      const olderIndex = testAnalyses.findIndex(a => a.id === analysis1.id);
      expect(newerIndex).toBeLessThan(olderIndex);
    });
  });

  describe('findByCVFile', () => {
    it('should return all analyses for a CV file', async () => {
      await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Job A',
        matchScore: 75,
        missingSkills: [],
        recommendations: []
      });

      await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Job B',
        matchScore: 80,
        missingSkills: [],
        recommendations: []
      });

      const analyses = await CVAnalysisModel.findByCVFile(testCVFileId);

      expect(analyses.length).toBeGreaterThanOrEqual(2);
      analyses.forEach(analysis => {
        expect(analysis.cvFileId).toBe(testCVFileId);
      });
    });
  });

  describe('delete', () => {
    it('should delete analysis by ID', async () => {
      const data: CreateCVAnalysisDTO = {
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Delete test',
        matchScore: 75,
        missingSkills: [],
        recommendations: []
      };

      const created = await CVAnalysisModel.create(data);
      await CVAnalysisModel.delete(created.id);

      const found = await CVAnalysisModel.findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('getUserStats', () => {
    it('should return correct statistics for user', async () => {
      // Create analyses with different scores
      await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Job 1',
        matchScore: 60,
        missingSkills: [],
        recommendations: []
      });

      await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Job 2',
        matchScore: 80,
        missingSkills: [],
        recommendations: []
      });

      await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Job 3',
        matchScore: 90,
        missingSkills: [],
        recommendations: []
      });

      const stats = await CVAnalysisModel.getUserStats(testUserId);

      expect(stats.totalAnalyses).toBeGreaterThanOrEqual(3);
      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.highestScore).toBeGreaterThanOrEqual(90);
      expect(stats.lowestScore).toBeLessThanOrEqual(60);
    });

    it('should return zero stats for user with no analyses', async () => {
      const newUser = await UserModel.create(`nostats-${Date.now()}@example.com`, 'password123');
      const stats = await CVAnalysisModel.getUserStats(newUser.id);

      expect(stats.totalAnalyses).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.highestScore).toBe(0);
      expect(stats.lowestScore).toBe(0);

      await pool.query('DELETE FROM users WHERE id = $1', [newUser.id]);
    });
  });

  describe('cascade delete', () => {
    it('should delete analyses when CV file is deleted', async () => {
      const tempUser = await UserModel.create(`temp-${Date.now()}@example.com`, 'password123');
      const tempCVFile = await CVFileModel.create({
        userId: tempUser.id,
        fileName: 'temp-cv.pdf',
        originalName: 'temp-resume.pdf',
        s3Key: `${tempUser.id}/temp-cv.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      });

      const analysis = await CVAnalysisModel.create({
        userId: tempUser.id,
        cvFileId: tempCVFile.id,
        jobDescription: 'Temp job',
        matchScore: 75,
        missingSkills: [],
        recommendations: []
      });

      // Verify analysis exists
      const foundBefore = await CVAnalysisModel.findById(analysis.id);
      expect(foundBefore).toBeDefined();

      // Delete CV file (should cascade to analyses)
      await pool.query('DELETE FROM cv_files WHERE id = $1', [tempCVFile.id]);

      // Verify analysis is deleted
      const foundAfter = await CVAnalysisModel.findById(analysis.id);
      expect(foundAfter).toBeNull();

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [tempUser.id]);
    });

    it('should delete analyses when user is deleted', async () => {
      const tempUser = await UserModel.create(`temp2-${Date.now()}@example.com`, 'password123');
      const tempCVFile = await CVFileModel.create({
        userId: tempUser.id,
        fileName: 'temp-cv-2.pdf',
        originalName: 'temp-resume-2.pdf',
        s3Key: `${tempUser.id}/temp-cv-2.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      });

      const analysis = await CVAnalysisModel.create({
        userId: tempUser.id,
        cvFileId: tempCVFile.id,
        jobDescription: 'Temp job 2',
        matchScore: 80,
        missingSkills: [],
        recommendations: []
      });

      // Verify analysis exists
      const foundBefore = await CVAnalysisModel.findById(analysis.id);
      expect(foundBefore).toBeDefined();

      // Delete user (should cascade to cv_files and analyses)
      await pool.query('DELETE FROM users WHERE id = $1', [tempUser.id]);

      // Verify analysis is deleted
      const foundAfter = await CVAnalysisModel.findById(analysis.id);
      expect(foundAfter).toBeNull();
    });
  });
});
