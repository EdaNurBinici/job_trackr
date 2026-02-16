/**
 * CV File Model
 * Database operations for CV files
 * Requirements: 2.1, 4.1
 */

import { pool } from '../config/database';

export interface CVFile {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  s3Key: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCVFileDTO {
  userId: string;
  fileName: string;
  originalName: string;
  s3Key: string;
  fileSize: number;
  mimeType: string;
}

export class CVFileModel {
  /**
   * Create a new CV file record
   */
  static async create(data: CreateCVFileDTO): Promise<CVFile> {
    const query = `
      INSERT INTO cv_files (user_id, file_name, original_name, s3_key, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        user_id AS "userId",
        file_name AS "fileName",
        original_name AS "originalName",
        s3_key AS "s3Key",
        file_size AS "fileSize",
        mime_type AS "mimeType",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const values = [
      data.userId,
      data.fileName,
      data.originalName,
      data.s3Key,
      data.fileSize,
      data.mimeType,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find CV file by ID
   */
  static async findById(id: string): Promise<CVFile | null> {
    const query = `
      SELECT 
        id,
        user_id AS "userId",
        file_name AS "fileName",
        original_name AS "originalName",
        s3_key AS "s3Key",
        file_size AS "fileSize",
        mime_type AS "mimeType",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cv_files
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all CV files for a user
   */
  static async findByUser(userId: string): Promise<CVFile[]> {
    const query = `
      SELECT 
        id,
        user_id AS "userId",
        file_name AS "fileName",
        original_name AS "originalName",
        s3_key AS "s3Key",
        file_size AS "fileSize",
        mime_type AS "mimeType",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cv_files
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Delete CV file record
   */
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM cv_files WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Check if user owns the CV file
   */
  static async isOwner(id: string, userId: string): Promise<boolean> {
    const query = 'SELECT id FROM cv_files WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rows.length > 0;
  }
}
