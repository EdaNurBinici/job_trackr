/**
 * AI Service (Groq)
 * Handles AI-powered analysis using Groq API
 * Requirements: 6.1-6.5
 */

import Groq from 'groq-sdk';

// Check if Groq is configured
const isGroqConfigured = !!process.env.GROQ_API_KEY;

// Groq Client
const groq = isGroqConfigured
  ? new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;

export interface CVAnalysisResult {
  match_score: number;
  missing_skills: string[];
  recommendations: string[];
}

export class AIService {
  /**
   * Check if AI service is configured
   */
  static isConfigured(): boolean {
    return isGroqConfigured;
  }

  /**
   * Analyze CV against job description
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  static async analyzeCVMatch(
    cvText: string,
    jobDescription: string
  ): Promise<CVAnalysisResult> {
    if (!isGroqConfigured || !groq) {
      throw new Error('Groq API is not configured. Please set GROQ_API_KEY in .env');
    }

    try {
      const prompt = this.buildAnalysisPrompt(cvText, jobDescription);

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR recruiter and career advisor. Analyze CVs and job descriptions to provide accurate matching scores and actionable recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      // Parse AI response
      const result = JSON.parse(responseText) as CVAnalysisResult;

      // Validate response
      this.validateAnalysisResult(result);

      return result;
    } catch (error) {
      console.error('AI analysis error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid Groq API key');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('AI service rate limit exceeded. Please try again later.');
        }
      }

      throw new Error('Failed to analyze CV. Please try again.');
    }
  }

  /**
   * Build analysis prompt
   */
  private static buildAnalysisPrompt(cvText: string, jobDescription: string): string {
    return `Analyze the following CV against the job description and provide a detailed matching analysis.

CV:
${cvText}

Job Description:
${jobDescription}

Provide a JSON response with the following structure:
{
  "match_score": <integer 0-100>,
  "missing_skills": [<array of skills mentioned in job but not clearly present in CV>],
  "recommendations": [<array of specific, actionable improvement suggestions>]
}

Guidelines:
- match_score: Calculate based on skills match, experience relevance, and overall fit (0-100)
- missing_skills: List only significant skills/technologies from job description that are clearly absent in CV
- recommendations: Provide 3-5 specific, actionable suggestions to improve the CV for this role

Be objective and constructive. Focus on technical skills, experience, and qualifications.`;
  }

  /**
   * Validate AI analysis result
   */
  private static validateAnalysisResult(result: any): void {
    if (typeof result.match_score !== 'number') {
      throw new Error('Invalid AI response: match_score must be a number');
    }

    if (result.match_score < 0 || result.match_score > 100) {
      throw new Error('Invalid AI response: match_score must be between 0 and 100');
    }

    if (!Array.isArray(result.missing_skills)) {
      throw new Error('Invalid AI response: missing_skills must be an array');
    }

    if (!Array.isArray(result.recommendations)) {
      throw new Error('Invalid AI response: recommendations must be an array');
    }
  }

  /**
   * Generic chat method for AI interactions
   * Requirements: 13.1
   */
  static async chat(prompt: string): Promise<string> {
    if (!isGroqConfigured || !groq) {
      throw new Error('Groq API is not configured. Please set GROQ_API_KEY in .env');
    }

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      return responseText;
    } catch (error) {
      console.error('AI chat error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid Groq API key');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('AI service rate limit exceeded. Please try again later.');
        }
      }

      throw new Error('Failed to generate response. Please try again.');
    }
  }
}
