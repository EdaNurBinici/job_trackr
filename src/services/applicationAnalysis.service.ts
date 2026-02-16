/**
 * Application Analysis Service
 * Sprint 1: AI Fit Score Analysis with Groq
 */

import { AIService } from './ai.service';
import { PDFParserService } from './pdfParser.service';
import { CVFileModel } from '../models/cvFile.model';
import { ApplicationModel } from '../models/application.model';
import {
  ApplicationAnalysisModel,
  CreateApplicationAnalysisDTO,
  ApplicationAnalysis,
} from '../models/applicationAnalysis.model';
import { S3Service } from './s3.service';
import Groq from 'groq-sdk';
import { z } from 'zod';

// Zod schema for strict JSON validation
const FitScoreResponseSchema = z.object({
  fit_score: z.number().int().min(0).max(100),
  strengths: z.array(
    z.object({
      point: z.string().min(1),
      cv_evidence: z.string().min(1),
    })
  ),
  gaps: z.array(
    z.object({
      point: z.string().min(1),
      impact: z.string().min(1),
    })
  ),
  suggestions: z.array(z.string().min(1)),
});

type FitScoreResponse = z.infer<typeof FitScoreResponseSchema>;

export class ApplicationAnalysisService {
  /**
   * Analyze application fit score
   * Main entry point for Sprint 1
   */
  static async analyzeApplication(
    applicationId: string,
    cvFileId: string,
    userId: string,
    language: string = 'tr'
  ): Promise<ApplicationAnalysis> {
    // Validate AI service
    if (!AIService.isConfigured()) {
      throw new Error(
        'AI service is not configured. Please set GROQ_API_KEY in environment variables.'
      );
    }

    // Get application
    const application = await ApplicationModel.findById(userId, applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // Validate job description exists
    if (!application.jobDescription || application.jobDescription.trim().length < 50) {
      throw new Error(
        'Job description is required and must be at least 50 characters for analysis'
      );
    }

    // Check if analysis already exists (cache hit)
    const existingAnalysis = await ApplicationAnalysisModel.findByApplicationAndJobHash(
      applicationId,
      application.jobDescription
    );

    if (existingAnalysis) {
      console.log('✅ Cache hit: Returning existing analysis');
      return existingAnalysis;
    }

    // Get CV file
    const cvFile = await CVFileModel.findById(cvFileId);
    if (!cvFile) {
      throw new Error('CV file not found');
    }

    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }

    if (cvFile.mimeType !== 'application/pdf') {
      throw new Error('Only PDF files can be analyzed');
    }

    // Extract CV text (S3 or local storage)
    const fileBuffer = await S3Service.getFileBuffer(cvFile.s3Key);
    const cvText = await PDFParserService.extractTextFromPDF(fileBuffer);

    // Call Groq AI with strict JSON
    const aiResult = await this.callGroqFitScoreAnalysis(cvText, application.jobDescription, language);

    // Save to database
    const analysisData: CreateApplicationAnalysisDTO = {
      applicationId,
      cvFileId,
      jobDescription: application.jobDescription,
      fitScore: aiResult.fit_score,
      strengths: aiResult.strengths,
      gaps: aiResult.gaps,
      suggestions: aiResult.suggestions,
      aiRawResponse: aiResult,
    };

    const analysis = await ApplicationAnalysisModel.create(analysisData);

    return analysis;
  }

  /**
   * Call Groq API with strict JSON schema
   */
  private static async callGroqFitScoreAnalysis(
    cvText: string,
    jobDescription: string,
    language: string = 'tr'
  ): Promise<FitScoreResponse> {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const prompt = this.buildFitScorePrompt(cvText, jobDescription, language);

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an expert HR recruiter and career advisor. Analyze CVs against job descriptions to provide accurate fit scores.

CRITICAL RULES:
1. ALWAYS provide cv_evidence with EXACT quotes from the CV (minimum 5 words)
2. If you cannot find evidence in CV, DO NOT include it in strengths
3. Be honest about gaps - this helps candidates improve
4. Suggestions must be specific and actionable`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2, // Low temperature for consistency
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      // Parse and validate with Zod
      const parsed = JSON.parse(responseText);
      const validated = FitScoreResponseSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error('Groq API error:', error);

      if (error instanceof z.ZodError) {
        console.error('Validation errors:', JSON.stringify(error.issues));
        throw new Error('AI returned invalid response format. Please try again.');
      }

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid Groq API key');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('AI service rate limit exceeded. Please try again later.');
        }
      }

      throw new Error('Failed to analyze application. Please try again.');
    }
  }

  /**
   * Build Groq prompt for fit score analysis
   */
  private static buildFitScorePrompt(cvText: string, jobDescription: string, language: string = 'tr'): string {
    const languageInstruction = language === 'en' 
      ? 'Respond in English.' 
      : 'Türkçe cevap ver.';

    return `Analyze this CV against the job description and calculate a fit score.

${languageInstruction}

CV:
${cvText}

---

JOB DESCRIPTION:
${jobDescription}

---

Provide a JSON response with this EXACT structure:

{
  "fit_score": <integer 0-100>,
  "strengths": [
    {
      "point": "<specific strength>",
      "cv_evidence": "<EXACT quote from CV proving this, minimum 5 words>"
    }
  ],
  "gaps": [
    {
      "point": "<missing skill or requirement>",
      "impact": "<why this matters for the role>"
    }
  ],
  "suggestions": [
    "<specific actionable suggestion to improve CV>"
  ]
}

SCORING GUIDE:
- 90-100: Exceptional match, all key requirements met with strong evidence
- 75-89: Strong match, most requirements met
- 60-74: Good match, core requirements met but some gaps
- 40-59: Moderate match, significant gaps in key areas
- 0-39: Poor match, major requirements missing

REQUIREMENTS:
1. cv_evidence MUST be EXACT quotes from CV (minimum 5 words)
2. Include 3-5 strengths with evidence
3. Include 2-4 gaps (be honest)
4. Include 3-5 actionable suggestions
5. Be objective and constructive
6. ${languageInstruction}`;
  }

  /**
   * Get analysis for application
   */
  static async getAnalysis(
    applicationId: string,
    userId: string
  ): Promise<ApplicationAnalysis | null> {
    // Verify ownership
    const application = await ApplicationModel.findById(userId, applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    return ApplicationAnalysisModel.findByApplicationId(applicationId);
  }

  /**
   * List user's analyses
   */
  static async listUserAnalyses(userId: string, limit: number = 50): Promise<ApplicationAnalysis[]> {
    return ApplicationAnalysisModel.findByUserId(userId, limit);
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string) {
    return ApplicationAnalysisModel.getUserStats(userId);
  }

}
