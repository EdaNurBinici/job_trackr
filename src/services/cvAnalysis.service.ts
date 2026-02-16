/**
 * CV Analysis Service
 * Business logic for AI-powered CV analysis
 * Requirements: 4.1-4.4, 5.1-5.4, 6.1-6.5
 */

import { AIService } from './ai.service';
import { PDFParserService } from './pdfParser.service';
import { CVFileModel } from '../models/cvFile.model';
import { CVAnalysisModel, CreateCVAnalysisDTO, CVAnalysis } from '../models/cvAnalysis.model';
import { S3Service } from './s3.service';

export class CVAnalysisService {
  /**
   * Analyze CV against job description
   * Requirements: 4.1, 4.2, 5.1, 6.1-6.5
   */
  static async analyzeCV(
    cvFileId: string,
    jobDescription: string,
    userId: string,
    jobUrl?: string
  ): Promise<CVAnalysis> {
    // Validate inputs
    if (!jobDescription || jobDescription.trim().length < 50) {
      throw new Error('Job description must be at least 50 characters');
    }

    // Check if AI service is configured
    if (!AIService.isConfigured()) {
      throw new Error('AI service is not configured. Please set GROQ_API_KEY in environment variables.');
    }

    // Get CV file metadata
    const cvFile = await CVFileModel.findById(cvFileId);

    if (!cvFile) {
      throw new Error('CV file not found');
    }

    // Check ownership
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }

    // Check if file is PDF
    if (cvFile.mimeType !== 'application/pdf') {
      throw new Error('Only PDF files can be analyzed. Please upload a PDF version of your CV.');
    }

    // Read CV file (S3 or local storage)
    const fileBuffer = await S3Service.getFileBuffer(cvFile.s3Key);

    // Extract text from PDF
    const cvText = await PDFParserService.extractTextFromPDF(fileBuffer);

    // Analyze with AI
    const aiResult = await AIService.analyzeCVMatch(cvText, jobDescription);

    // Save analysis to database
    const analysisData: CreateCVAnalysisDTO = {
      userId,
      cvFileId,
      jobDescription: jobDescription.trim(),
      jobUrl: jobUrl?.trim(),
      matchScore: aiResult.match_score,
      missingSkills: aiResult.missing_skills,
      recommendations: aiResult.recommendations,
      aiResponse: aiResult,
    };

    const analysis = await CVAnalysisModel.create(analysisData);

    return analysis;
  }

  /**
   * Get analysis by ID
   * Requirements: 7.1-7.4
   */
  static async getAnalysis(analysisId: string, userId: string): Promise<CVAnalysis> {
    const analysis = await CVAnalysisModel.findById(analysisId);

    if (!analysis) {
      throw new Error('Analysis not found');
    }

    // Check ownership
    if (analysis.userId !== userId) {
      throw new Error('Unauthorized access to analysis');
    }

    return analysis;
  }

  /**
   * List user's analyses
   * Requirements: 7.1
   */
  static async listUserAnalyses(userId: string, limit: number = 50): Promise<CVAnalysis[]> {
    return CVAnalysisModel.findByUser(userId, limit);
  }

  /**
   * Delete analysis
   * Requirements: 7.1
   */
  static async deleteAnalysis(analysisId: string, userId: string): Promise<void> {
    const analysis = await CVAnalysisModel.findById(analysisId);

    if (!analysis) {
      throw new Error('Analysis not found');
    }

    // Check ownership
    if (analysis.userId !== userId) {
      throw new Error('Unauthorized access to analysis');
    }

    await CVAnalysisModel.delete(analysisId);
  }

  /**
   * Get user's analysis statistics
   */
  static async getUserStats(userId: string) {
    return CVAnalysisModel.getUserStats(userId);
  }

}
