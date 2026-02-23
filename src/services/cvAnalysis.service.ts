import { AIService } from './ai.service';
import { PDFParserService } from './pdfParser.service';
import { CVFileModel } from '../models/cvFile.model';
import { CVAnalysisModel, CreateCVAnalysisDTO, CVAnalysis } from '../models/cvAnalysis.model';
import { S3Service } from './s3.service';
export class CVAnalysisService {
  static async analyzeCV(
    cvFileId: string,
    jobDescription: string,
    userId: string,
    jobUrl?: string
  ): Promise<CVAnalysis> {
    if (!jobDescription || jobDescription.trim().length < 50) {
      throw new Error('Job description must be at least 50 characters');
    }
    if (!AIService.isConfigured()) {
      throw new Error('AI service is not configured. Please set GROQ_API_KEY in environment variables.');
    }
    const cvFile = await CVFileModel.findById(cvFileId);
    if (!cvFile) {
      throw new Error('CV file not found');
    }
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }
    if (cvFile.mimeType !== 'application/pdf') {
      throw new Error('Only PDF files can be analyzed. Please upload a PDF version of your CV.');
    }
    const fileBuffer = await S3Service.getFileBuffer(cvFile.s3Key);
    const cvText = await PDFParserService.extractTextFromPDF(fileBuffer);
    const aiResult = await AIService.analyzeCVMatch(cvText, jobDescription);
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
  static async getAnalysis(analysisId: string, userId: string): Promise<CVAnalysis> {
    const analysis = await CVAnalysisModel.findById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }
    if (analysis.userId !== userId) {
      throw new Error('Unauthorized access to analysis');
    }
    return analysis;
  }
  static async listUserAnalyses(userId: string, limit: number = 50): Promise<CVAnalysis[]> {
    return CVAnalysisModel.findByUser(userId, limit);
  }
  static async deleteAnalysis(analysisId: string, userId: string): Promise<void> {
    const analysis = await CVAnalysisModel.findById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }
    if (analysis.userId !== userId) {
      throw new Error('Unauthorized access to analysis');
    }
    await CVAnalysisModel.delete(analysisId);
  }
  static async getUserStats(userId: string) {
    return CVAnalysisModel.getUserStats(userId);
  }
}
