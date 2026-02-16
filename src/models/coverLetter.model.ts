/**
 * Cover Letter Model
 * Database operations for cover letters
 * Requirements: 13.1-13.4, 14.1-14.3
 */

import { pool } from '../config/database';

export interface CoverLetter {
  id: string;
  userId: string;
  cvFileId: string | null;
  applicationId: string | null;
  companyName: string;
  position: string;
  tone: 'formal' | 'casual' | 'creative';
  language: 'tr' | 'en';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCoverLetterDTO {
  userId: string;
  cvFileId?: string;
  applicationId?: string;
  companyName: string;
  position: string;
  tone: 'formal' | 'casual' | 'creative';
  language: 'tr' | 'en';
  content: string;
}

export interface UpdateCoverLetterDTO {
  content?: string;
  companyName?: string;
  position?: string;
}

export class CoverLetterModel {
  /**
   * Create a new cover letter
   */
  static async create(data: CreateCoverLetterDTO): Promise<CoverLetter> {
    const query = `
      INSERT INTO cover_letters (
        user_id, cv_file_id, application_id, company_name, position, tone, language, content
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        user_id AS "userId",
        cv_file_id AS "cvFileId",
        application_id AS "applicationId",
        company_name AS "companyName",
        position,
        tone,
        language,
        content,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const values = [
      data.userId,
      data.cvFileId || null,
      data.applicationId || null,
      data.companyName,
      data.position,
      data.tone,
      data.language,
      data.content,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find cover letter by ID
   */
  static async findById(id: string): Promise<CoverLetter | null> {
    const query = `
      SELECT 
        id,
        user_id AS "userId",
        cv_file_id AS "cvFileId",
        application_id AS "applicationId",
        company_name AS "companyName",
        position,
        tone,
        language,
        content,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cover_letters
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all cover letters by user
   */
  static async findByUser(userId: string, limit: number = 50): Promise<CoverLetter[]> {
    const query = `
      SELECT 
        id,
        user_id AS "userId",
        cv_file_id AS "cvFileId",
        application_id AS "applicationId",
        company_name AS "companyName",
        position,
        tone,
        language,
        content,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cover_letters
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Find cover letters by application
   */
  static async findByApplication(applicationId: string): Promise<CoverLetter[]> {
    const query = `
      SELECT 
        id,
        user_id AS "userId",
        cv_file_id AS "cvFileId",
        application_id AS "applicationId",
        company_name AS "companyName",
        position,
        tone,
        language,
        content,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cover_letters
      WHERE application_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [applicationId]);
    return result.rows;
  }

  /**
   * Update cover letter
   */
  static async update(id: string, data: UpdateCoverLetterDTO): Promise<CoverLetter | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(data.content);
    }

    if (data.companyName !== undefined) {
      updates.push(`company_name = $${paramCount++}`);
      values.push(data.companyName);
    }

    if (data.position !== undefined) {
      updates.push(`position = $${paramCount++}`);
      values.push(data.position);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE cover_letters
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        user_id AS "userId",
        cv_file_id AS "cvFileId",
        application_id AS "applicationId",
        company_name AS "companyName",
        position,
        tone,
        language,
        content,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete cover letter
   */
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM cover_letters WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string) {
    const query = `
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN tone = 'formal' THEN 1 END) AS formal_count,
        COUNT(CASE WHEN tone = 'casual' THEN 1 END) AS casual_count,
        COUNT(CASE WHEN tone = 'creative' THEN 1 END) AS creative_count,
        COUNT(CASE WHEN language = 'tr' THEN 1 END) AS tr_count,
        COUNT(CASE WHEN language = 'en' THEN 1 END) AS en_count
      FROM cover_letters
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}
