/**
 * Application Analysis Model
 * Sprint 1: AI Fit Score Analysis
 */

import { pool } from '../config/database';
import { createHash } from 'crypto';

export interface Strength {
  point: string;
  cv_evidence: string;
}

export interface Gap {
  point: string;
  impact: string;
}

export interface ApplicationAnalysis {
  id: string;
  applicationId: string;
  cvFileId: string;
  jobDescriptionHash: string;
  fitScore: number;
  strengths: Strength[];
  gaps: Gap[];
  suggestions: string[];
  aiRawResponse?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApplicationAnalysisDTO {
  applicationId: string;
  cvFileId: string;
  jobDescription: string;
  fitScore: number;
  strengths: Strength[];
  gaps: Gap[];
  suggestions: string[];
  aiRawResponse?: any;
}

export class ApplicationAnalysisModel {
  /**
   * Generate SHA-256 hash of job description
   */
  static hashJobDescription(jobDescription: string): string {
    return createHash('sha256')
      .update(jobDescription.trim().toLowerCase())
      .digest('hex');
  }

  /**
   * Create new application analysis
   */
  static async create(data: CreateApplicationAnalysisDTO): Promise<ApplicationAnalysis> {
    const jobDescriptionHash = this.hashJobDescription(data.jobDescription);

    const query = `
      INSERT INTO application_analyses (
        application_id, cv_file_id, job_description_hash,
        fit_score, strengths, gaps, suggestions, ai_raw_response
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (application_id, job_description_hash)
      DO UPDATE SET
        cv_file_id = EXCLUDED.cv_file_id,
        fit_score = EXCLUDED.fit_score,
        strengths = EXCLUDED.strengths,
        gaps = EXCLUDED.gaps,
        suggestions = EXCLUDED.suggestions,
        ai_raw_response = EXCLUDED.ai_raw_response,
        updated_at = NOW()
      RETURNING
        id,
        application_id AS "applicationId",
        cv_file_id AS "cvFileId",
        job_description_hash AS "jobDescriptionHash",
        fit_score AS "fitScore",
        strengths,
        gaps,
        suggestions,
        ai_raw_response AS "aiRawResponse",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const values = [
      data.applicationId,
      data.cvFileId,
      jobDescriptionHash,
      data.fitScore,
      JSON.stringify(data.strengths),
      JSON.stringify(data.gaps),
      JSON.stringify(data.suggestions),
      data.aiRawResponse ? JSON.stringify(data.aiRawResponse) : null,
    ];

    const result = await pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Find analysis by application ID
   */
  static async findByApplicationId(applicationId: string): Promise<ApplicationAnalysis | null> {
    const query = `
      SELECT
        id,
        application_id AS "applicationId",
        cv_file_id AS "cvFileId",
        job_description_hash AS "jobDescriptionHash",
        fit_score AS "fitScore",
        strengths,
        gaps,
        suggestions,
        ai_raw_response AS "aiRawResponse",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM application_analyses
      WHERE application_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [applicationId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Check if analysis exists for application and job description
   */
  static async findByApplicationAndJobHash(
    applicationId: string,
    jobDescription: string
  ): Promise<ApplicationAnalysis | null> {
    const jobDescriptionHash = this.hashJobDescription(jobDescription);

    const query = `
      SELECT
        id,
        application_id AS "applicationId",
        cv_file_id AS "cvFileId",
        job_description_hash AS "jobDescriptionHash",
        fit_score AS "fitScore",
        strengths,
        gaps,
        suggestions,
        ai_raw_response AS "aiRawResponse",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM application_analyses
      WHERE application_id = $1 AND job_description_hash = $2
    `;

    const result = await pool.query(query, [applicationId, jobDescriptionHash]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Get all analyses for a user (via applications)
   */
  static async findByUserId(userId: string, limit: number = 50): Promise<ApplicationAnalysis[]> {
    const query = `
      SELECT
        aa.id,
        aa.application_id AS "applicationId",
        aa.cv_file_id AS "cvFileId",
        aa.job_description_hash AS "jobDescriptionHash",
        aa.fit_score AS "fitScore",
        aa.strengths,
        aa.gaps,
        aa.suggestions,
        aa.ai_raw_response AS "aiRawResponse",
        aa.created_at AS "createdAt",
        aa.updated_at AS "updatedAt"
      FROM application_analyses aa
      INNER JOIN applications a ON aa.application_id = a.id
      WHERE a.user_id = $1
      ORDER BY aa.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows.map(this.mapRow);
  }

  /**
   * Delete analysis
   */
  static async delete(id: string): Promise<void> {
    const query = 'DELETE FROM application_analyses WHERE id = $1';
    await pool.query(query, [id]);
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<{
    totalAnalyses: number;
    averageFitScore: number;
    highestFitScore: number;
    lowestFitScore: number;
  }> {
    const query = `
      SELECT
        COUNT(*)::int as total_analyses,
        COALESCE(AVG(aa.fit_score)::int, 0) as average_fit_score,
        COALESCE(MAX(aa.fit_score), 0) as highest_fit_score,
        COALESCE(MIN(aa.fit_score), 0) as lowest_fit_score
      FROM application_analyses aa
      INNER JOIN applications a ON aa.application_id = a.id
      WHERE a.user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      totalAnalyses: row.total_analyses,
      averageFitScore: row.average_fit_score,
      highestFitScore: row.highest_fit_score,
      lowestFitScore: row.lowest_fit_score,
    };
  }

  /**
   * Map database row to ApplicationAnalysis object
   */
  private static mapRow(row: any): ApplicationAnalysis {
    return {
      id: row.id,
      applicationId: row.applicationId,
      cvFileId: row.cvFileId,
      jobDescriptionHash: row.jobDescriptionHash,
      fitScore: row.fitScore,
      strengths: row.strengths || [],
      gaps: row.gaps || [],
      suggestions: row.suggestions || [],
      aiRawResponse: row.aiRawResponse,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
