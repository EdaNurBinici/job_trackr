/**
 * CV Analysis Service Tests
 * Tests for AI-powered CV analysis functionality
 * Requirements: 4.1-4.4, 5.1-5.4, 6.1-6.5
 */

import { CVAnalysisService } from '../cvAnalysis.service';
import { AIService } from '../ai.service';
import { PDFParserService } from '../pdfParser.service';
import { CVFileModel } from '../../models/cvFile.model';
import { CVAnalysisModel } from '../../models/cvAnalysis.model';
import { UserModel } from '../../models/user.model';
import { pool } from '../../config/database';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

// Mock AI Service
jest.mock('../ai.service');
jest.mock('../pdfParser.service');

describe('CVAnalysisService', () => {
  let testUserId: string;
  let testUserId2: string;
  let testCVFileId: string;
  let testFilePath: string;

  beforeAll(async () => {
    // Create test users
    const user1 = await UserModel.create(`cvanalysis-service-${Date.now()}@example.com`, 'password123');
    const user2 = await UserModel.create(`cvanalysis-service2-${Date.now()}@example.com`, 'password123');
    testUserId = user1.id;
    testUserId2 = user2.id;

    // Create test directory
    const testDir = join(process.cwd(), 'uploads', 'test-cvs');
    await mkdir(testDir, { recursive: true });

    // Create a test PDF file
    testFilePath = join(testDir, `test-cv-${Date.now()}.pdf`);
    const pdfContent = Buffer.from('%PDF-1.4\nTest CV Content\n%%EOF');
    await writeFile(testFilePath, pdfContent);

    // Create test CV file record
    const cvFile = await CVFileModel.create({
      userId: testUserId,
      fileName: 'test-cv.pdf',
      originalName: 'resume.pdf',
      s3Key: testFilePath,
      fileSize: pdfContent.length,
      mimeType: 'application/pdf'
    });

    testCVFileId = cvFile.id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM cv_analyses WHERE user_id = $1 OR user_id = $2', [testUserId, testUserId2]);
    await pool.query('DELETE FROM cv_files WHERE user_id = $1 OR user_id = $2', [testUserId, testUserId2]);
    await pool.query('DELETE FROM users WHERE id = $1 OR id = $2', [testUserId, testUserId2]);

    // Clean up test files
    try {
      await rm(join(process.cwd(), 'uploads', 'test-cvs'), { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AI Service configuration
    (AIService.isConfigured as jest.Mock).mockReturnValue(true);

    // Mock PDF Parser
    (PDFParserService.extractTextFromPDF as jest.Mock).mockResolvedValue(
      'John Doe\nSoftware Engineer\nExperience: 5 years in JavaScript, Node.js, React\nEducation: BS Computer Science'
    );

    // Mock AI Service analysis
    (AIService.analyzeCVMatch as jest.Mock).mockResolvedValue({
      match_score: 75,
      missing_skills: ['TypeScript', 'Docker'],
      recommendations: [
        'Add TypeScript projects to your portfolio',
        'Highlight Docker experience if you have any',
        'Consider taking a Docker certification course'
      ]
    });
  });

  describe('analyzeCV', () => {
    const validJobDescription = 'We are looking for a Senior Software Engineer with 5+ years of experience in JavaScript, TypeScript, React, Node.js, and Docker. Must have strong problem-solving skills.';

    it('should successfully analyze CV and return analysis', async () => {
      const analysis = await CVAnalysisService.analyzeCV(
        testCVFileId,
        validJobDescription,
        testUserId
      );

      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.userId).toBe(testUserId);
      expect(analysis.cvFileId).toBe(testCVFileId);
      expect(analysis.jobDescription).toBe(validJobDescription);
      expect(analysis.matchScore).toBe(75);
      expect(analysis.missingSkills).toEqual(['TypeScript', 'Docker']);
      expect(analysis.recommendations).toHaveLength(3);
      expect(analysis.createdAt).toBeDefined();
    });

    it('should include optional job URL in analysis', async () => {
      const jobUrl = 'https://example.com/jobs/senior-engineer';

      const analysis = await CVAnalysisService.analyzeCV(
        testCVFileId,
        validJobDescription,
        testUserId,
        jobUrl
      );

      expect(analysis.jobUrl).toBe(jobUrl);
    });

    it('should call PDFParserService to extract text', async () => {
      await CVAnalysisService.analyzeCV(
        testCVFileId,
        validJobDescription,
        testUserId
      );

      expect(PDFParserService.extractTextFromPDF).toHaveBeenCalledTimes(1);
      expect(PDFParserService.extractTextFromPDF).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should call AIService with CV text and job description', async () => {
      await CVAnalysisService.analyzeCV(
        testCVFileId,
        validJobDescription,
        testUserId
      );

      expect(AIService.analyzeCVMatch).toHaveBeenCalledTimes(1);
      expect(AIService.analyzeCVMatch).toHaveBeenCalledWith(
        expect.stringContaining('John Doe'),
        validJobDescription
      );
    });

    it('should save analysis to database', async () => {
      const analysis = await CVAnalysisService.analyzeCV(
        testCVFileId,
        validJobDescription,
        testUserId
      );

      const saved = await CVAnalysisModel.findById(analysis.id);
      expect(saved).toBeDefined();
      expect(saved?.matchScore).toBe(75);
    });

    it('should reject job description shorter than 50 characters', async () => {
      const shortDescription = 'Too short';

      await expect(
        CVAnalysisService.analyzeCV(testCVFileId, shortDescription, testUserId)
      ).rejects.toThrow('Job description must be at least 50 characters');
    });

    it('should reject empty job description', async () => {
      await expect(
        CVAnalysisService.analyzeCV(testCVFileId, '', testUserId)
      ).rejects.toThrow('Job description must be at least 50 characters');
    });

    it('should reject whitespace-only job description', async () => {
      await expect(
        CVAnalysisService.analyzeCV(testCVFileId, '   ', testUserId)
      ).rejects.toThrow('Job description must be at least 50 characters');
    });

    it('should throw error if AI service is not configured', async () => {
      (AIService.isConfigured as jest.Mock).mockReturnValue(false);

      await expect(
        CVAnalysisService.analyzeCV(testCVFileId, validJobDescription, testUserId)
      ).rejects.toThrow('AI service is not configured');
    });

    it('should throw error if CV file not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(
        CVAnalysisService.analyzeCV(nonExistentId, validJobDescription, testUserId)
      ).rejects.toThrow('CV file not found');
    });

    it('should throw error if user does not own the CV file', async () => {
      await expect(
        CVAnalysisService.analyzeCV(testCVFileId, validJobDescription, testUserId2)
      ).rejects.toThrow('Unauthorized access to CV file');
    });

    it('should throw error if file is not a PDF', async () => {
      // Create a non-PDF file
      const nonPdfFile = await CVFileModel.create({
        userId: testUserId,
        fileName: 'test-doc.docx',
        originalName: 'resume.docx',
        s3Key: 'test-path.docx',
        fileSize: 1000,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      await expect(
        CVAnalysisService.analyzeCV(nonPdfFile.id, validJobDescription, testUserId)
      ).rejects.toThrow('Only PDF files can be analyzed');

      // Cleanup
      await pool.query('DELETE FROM cv_files WHERE id = $1', [nonPdfFile.id]);
    });

    it('should handle PDF parsing errors gracefully', async () => {
      (PDFParserService.extractTextFromPDF as jest.Mock).mockRejectedValue(
        new Error('PDF parsing failed')
      );

      await expect(
        CVAnalysisService.analyzeCV(testCVFileId, validJobDescription, testUserId)
      ).rejects.toThrow('PDF parsing failed');
    });

    it('should handle AI service errors gracefully', async () => {
      (AIService.analyzeCVMatch as jest.Mock).mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(
        CVAnalysisService.analyzeCV(testCVFileId, validJobDescription, testUserId)
      ).rejects.toThrow('AI service unavailable');
    });

    it('should trim job description before saving', async () => {
      const descriptionWithSpaces = `  ${validJobDescription}  `;

      const analysis = await CVAnalysisService.analyzeCV(
        testCVFileId,
        descriptionWithSpaces,
        testUserId
      );

      expect(analysis.jobDescription).toBe(validJobDescription);
    });

    it('should trim job URL before saving', async () => {
      const urlWithSpaces = '  https://example.com/job  ';

      const analysis = await CVAnalysisService.analyzeCV(
        testCVFileId,
        validJobDescription,
        testUserId,
        urlWithSpaces
      );

      expect(analysis.jobUrl).toBe('https://example.com/job');
    });

    it('should complete analysis in reasonable time', async () => {
      const startTime = Date.now();

      await CVAnalysisService.analyzeCV(
        testCVFileId,
        validJobDescription,
        testUserId
      );

      const duration = Date.now() - startTime;

      // Should complete in less than 10 seconds (as per acceptance criteria)
      // In tests with mocks, should be much faster
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('getAnalysis', () => {
    let analysisId: string;

    beforeEach(async () => {
      const analysis = await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Test job description for get analysis test',
        matchScore: 80,
        missingSkills: ['Skill1'],
        recommendations: ['Recommendation1']
      });
      analysisId = analysis.id;
    });

    it('should retrieve analysis by ID', async () => {
      const analysis = await CVAnalysisService.getAnalysis(analysisId, testUserId);

      expect(analysis).toBeDefined();
      expect(analysis.id).toBe(analysisId);
      expect(analysis.userId).toBe(testUserId);
      expect(analysis.matchScore).toBe(80);
    });

    it('should throw error if analysis not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(
        CVAnalysisService.getAnalysis(nonExistentId, testUserId)
      ).rejects.toThrow('Analysis not found');
    });

    it('should throw error if user does not own the analysis', async () => {
      await expect(
        CVAnalysisService.getAnalysis(analysisId, testUserId2)
      ).rejects.toThrow('Unauthorized access to analysis');
    });
  });

  describe('listUserAnalyses', () => {
    beforeEach(async () => {
      // Create multiple analyses for testUserId
      await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Job 1',
        matchScore: 70,
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
    });

    it('should list all analyses for a user', async () => {
      const analyses = await CVAnalysisService.listUserAnalyses(testUserId);

      expect(analyses).toBeDefined();
      expect(analyses.length).toBeGreaterThanOrEqual(2);
      analyses.forEach(analysis => {
        expect(analysis.userId).toBe(testUserId);
      });
    });

    it('should respect limit parameter', async () => {
      const analyses = await CVAnalysisService.listUserAnalyses(testUserId, 1);

      expect(analyses.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array for user with no analyses', async () => {
      const newUser = await UserModel.create(`noanalyses-${Date.now()}@example.com`, 'password123');
      const analyses = await CVAnalysisService.listUserAnalyses(newUser.id);

      expect(analyses).toEqual([]);

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [newUser.id]);
    });
  });

  describe('deleteAnalysis', () => {
    let analysisId: string;

    beforeEach(async () => {
      const analysis = await CVAnalysisModel.create({
        userId: testUserId,
        cvFileId: testCVFileId,
        jobDescription: 'Test job for delete',
        matchScore: 75,
        missingSkills: [],
        recommendations: []
      });
      analysisId = analysis.id;
    });

    it('should delete analysis by ID', async () => {
      await CVAnalysisService.deleteAnalysis(analysisId, testUserId);

      const found = await CVAnalysisModel.findById(analysisId);
      expect(found).toBeNull();
    });

    it('should throw error if analysis not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(
        CVAnalysisService.deleteAnalysis(nonExistentId, testUserId)
      ).rejects.toThrow('Analysis not found');
    });

    it('should throw error if user does not own the analysis', async () => {
      await expect(
        CVAnalysisService.deleteAnalysis(analysisId, testUserId2)
      ).rejects.toThrow('Unauthorized access to analysis');
    });
  });

  describe('getUserStats', () => {
    beforeEach(async () => {
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
    });

    it('should return correct statistics', async () => {
      const stats = await CVAnalysisService.getUserStats(testUserId);

      expect(stats).toBeDefined();
      expect(stats.totalAnalyses).toBeGreaterThanOrEqual(3);
      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.highestScore).toBeGreaterThanOrEqual(90);
      expect(stats.lowestScore).toBeLessThanOrEqual(60);
    });
  });
});
