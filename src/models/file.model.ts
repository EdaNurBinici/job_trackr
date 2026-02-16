import { pool } from '../config/database';
import { FileMetadata } from '../types';

export class FileModel {
  /**
   * Create a new file metadata record
   */
  static async create(
    applicationId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    storagePath: string
  ): Promise<FileMetadata> {
    const query = `
      INSERT INTO files (application_id, file_name, file_size, mime_type, storage_path)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id, 
        application_id AS "applicationId", 
        file_name AS "fileName", 
        file_size AS "fileSize", 
        mime_type AS "mimeType", 
        storage_path AS "storagePath", 
        uploaded_at AS "uploadedAt"
    `;
    
    const values = [applicationId, fileName, fileSize, mimeType, storagePath];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find a file by ID
   */
  static async findById(fileId: string): Promise<FileMetadata | null> {
    const query = `
      SELECT 
        id, 
        application_id AS "applicationId", 
        file_name AS "fileName", 
        file_size AS "fileSize", 
        mime_type AS "mimeType", 
        storage_path AS "storagePath", 
        uploaded_at AS "uploadedAt"
      FROM files
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [fileId]);
    return result.rows[0] || null;
  }

  /**
   * Get all files for an application
   */
  static async findByApplication(applicationId: string): Promise<FileMetadata[]> {
    const query = `
      SELECT 
        id, 
        application_id AS "applicationId", 
        file_name AS "fileName", 
        file_size AS "fileSize", 
        mime_type AS "mimeType", 
        storage_path AS "storagePath", 
        uploaded_at AS "uploadedAt"
      FROM files
      WHERE application_id = $1
      ORDER BY uploaded_at DESC
    `;
    
    const result = await pool.query(query, [applicationId]);
    return result.rows;
  }

  /**
   * Delete a file by ID
   */
  static async delete(fileId: string): Promise<boolean> {
    const query = `DELETE FROM files WHERE id = $1`;
    const result = await pool.query(query, [fileId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Delete all files for an application (cascade delete)
   */
  static async deleteByApplication(applicationId: string): Promise<number> {
    const query = `DELETE FROM files WHERE application_id = $1`;
    const result = await pool.query(query, [applicationId]);
    return result.rowCount || 0;
  }

  /**
   * Delete all files for an application using a transaction client
   */
  static async deleteByApplicationWithClient(client: any, applicationId: string): Promise<number> {
    const query = `DELETE FROM files WHERE application_id = $1`;
    const result = await client.query(query, [applicationId]);
    return result.rowCount || 0;
  }

  /**
   * Count files for an application
   */
  static async countByApplication(applicationId: string): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM files WHERE application_id = $1`;
    const result = await pool.query(query, [applicationId]);
    return parseInt(result.rows[0].count, 10);
  }
}
