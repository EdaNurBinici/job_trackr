/**
 * CV Analysis Model
 * Database operations for CV analysis results
 * Requirements: 6.1-6.5, 7.1-7.4
 */

import { pool } from '../config/database';

export interface CVAnalysis {
  id: string;
  userId: string;
  cvFileId: string;
  jobDescription: string;
  jobUrl?: string;
  matchScore: number;
  missingSkills: string[];
  recommendations: string[];
  aiResponse?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCVAnalysisDTO {
  userId: string;
  cvFileId: string;
  jobDescription: string;
  jobUrl?: string;
  matchScore: number;
  missingSkills: string[];
  recommendations: string[];
  aiResponse?: any;
}

export class CVAnalysisModel {
  /**
   * Create new CV analysis
   */
  static async create(data: CreateCVAnalysisDTO): Promise<CVAnalysis> {
    const query = `
      INSERT INTO cv_analyses (
        user_id, cv_file_id, job_description, job_url,
        match_score, missing_skills, recommendations, ai_response
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      data.userId,
      data.cvFileId,
      data.jobDescription,
      data.jobUrl || null,
      data.matchScore,
      data.missingSkills,
      data.recommendations,
      data.aiResponse ? JSON.stringify(data.aiResponse) : null,
    ];

    const result = await pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Find analysis by ID
   */
  static async findById(id: string): Promise<CVAnalysis | null> {
    const query = 'SELECT * FROM cv_analyses WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find all analyses for a user
   */
  static async findByUser(userId: string, limit: number = 50): Promise<CVAnalysis[]> {
    const query = `
      SELECT * FROM cv_analyses
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows.map(this.mapRow);
  }

  /**
   * Find analyses by CV file
   */
  static async findByCVFile(cvFileId: string): Promise<CVAnalysis[]> {
    const query = `
      SELECT * FROM cv_analyses
      WHERE cv_file_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [cvFileId]);
    return result.rows.map(this.mapRow);
  }

  /**
   * Delete analysis
   */
  static async delete(id: string): Promise<void> {
    const query = 'DELETE FROM cv_analyses WHERE id = $1';
    await pool.query(query, [id]);
  }

  /**
   * Get analysis statistics for user
   */
  static async getUserStats(userId: string): Promise<{
    totalAnalyses: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  }> {
    const query = `
      SELECT
        COUNT(*)::int as total_analyses,
        COALESCE(AVG(match_score)::int, 0) as average_score,
        COALESCE(MAX(match_score), 0) as highest_score,
        COALESCE(MIN(match_score), 0) as lowest_score
      FROM cv_analyses
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      totalAnalyses: row.total_analyses,
      averageScore: row.average_score,
      highestScore: row.highest_score,
      lowestScore: row.lowest_score,
    };
  }

  /**
   * Map database row to CVAnalysis object
   */
  private static mapRow(row: any): CVAnalysis {
    return {
      id: row.id,
      userId: row.user_id,
      cvFileId: row.cv_file_id,
      jobDescription: row.job_description,
      jobUrl: row.job_url,
      matchScore: row.match_score,
      missingSkills: row.missing_skills || [],
      recommendations: row.recommendations || [],
      aiResponse: row.ai_response,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
