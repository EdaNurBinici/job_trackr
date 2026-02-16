import { pool } from '../config/database';
import { Application, CreateApplicationDTO, UpdateApplicationDTO, ApplicationFilters, PaginatedResult } from '../types';

export class ApplicationModel {
  /**
   * Create a new application
   */
  static async create(userId: string, data: CreateApplicationDTO): Promise<Application> {
    const query = `
      INSERT INTO applications (
        user_id, company_name, position, status, application_date, location, job_description, notes, source_link, reminder_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, 
        user_id AS "userId", 
        company_name AS "companyName", 
        position, 
        status, 
        application_date AS "applicationDate", 
        location,
        job_description AS "jobDescription",
        notes, 
        source_link AS "sourceLink", 
        reminder_date AS "reminderDate", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
    `;
    
    const values = [
      userId,
      data.companyName,
      data.position,
      data.status,
      data.applicationDate,
      data.location || null,
      data.jobDescription || null,
      data.notes || null,
      data.sourceLink || null,
      data.reminderDate || null
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find an application by ID (user-scoped)
   */
  static async findById(userId: string, applicationId: string): Promise<Application | null> {
    const query = `
      SELECT 
        id, 
        user_id AS "userId", 
        company_name AS "companyName", 
        position, 
        status, 
        application_date AS "applicationDate", 
        location,
        job_description AS "jobDescription",
        notes, 
        source_link AS "sourceLink", 
        reminder_date AS "reminderDate", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM applications
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [applicationId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Get all applications for a user with optional filters
   */
  static async findAll(userId: string, filters?: ApplicationFilters): Promise<PaginatedResult<Application>> {
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [userId];
    let paramCount = 2;

    // Search filter
    if (filters?.search) {
      // Escape SQL wildcards in search term
      const escapedSearch = filters.search.replace(/[%_]/g, '\\$&');
      conditions.push(`(company_name ILIKE $${paramCount} OR position ILIKE $${paramCount})`);
      values.push(`%${escapedSearch}%`);
      paramCount++;
    }

    // Status filter
    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }

    // Date range filters
    if (filters?.dateFrom) {
      conditions.push(`application_date >= $${paramCount}`);
      values.push(filters.dateFrom);
      paramCount++;
    }

    if (filters?.dateTo) {
      conditions.push(`application_date <= $${paramCount}`);
      values.push(filters.dateTo);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total matching records
    const countQuery = `SELECT COUNT(*) as count FROM applications WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Build sort clause
    const sortBy = filters?.sortBy || 'application_date';
    const sortOrder = filters?.sortOrder || 'desc';
    const sortClause = `ORDER BY ${this.mapSortField(sortBy)} ${sortOrder.toUpperCase()}`;

    // Build pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const offset = (page - 1) * pageSize;

    // Get paginated data
    const dataQuery = `
      SELECT 
        id, 
        user_id AS "userId", 
        company_name AS "companyName", 
        position, 
        status, 
        application_date AS "applicationDate", 
        location,
        job_description AS "jobDescription",
        notes, 
        source_link AS "sourceLink", 
        reminder_date AS "reminderDate", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM applications
      WHERE ${whereClause}
      ${sortClause}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const dataResult = await pool.query(dataQuery, [...values, pageSize, offset]);

    return {
      data: dataResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Update an application (user-scoped)
   */
  static async update(userId: string, applicationId: string, data: UpdateApplicationDTO): Promise<Application | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.companyName !== undefined) {
      fields.push(`company_name = $${paramCount++}`);
      values.push(data.companyName);
    }

    if (data.position !== undefined) {
      fields.push(`position = $${paramCount++}`);
      values.push(data.position);
    }

    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (data.applicationDate !== undefined) {
      fields.push(`application_date = $${paramCount++}`);
      values.push(data.applicationDate);
    }

    if (data.location !== undefined) {
      fields.push(`location = $${paramCount++}`);
      values.push(data.location);
    }

    if (data.jobDescription !== undefined) {
      fields.push(`job_description = $${paramCount++}`);
      values.push(data.jobDescription);
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`);
      values.push(data.notes);
    }

    if (data.sourceLink !== undefined) {
      fields.push(`source_link = $${paramCount++}`);
      values.push(data.sourceLink);
    }

    if (data.reminderDate !== undefined) {
      fields.push(`reminder_date = $${paramCount++}`);
      values.push(data.reminderDate);
    }

    if (fields.length === 0) {
      return this.findById(userId, applicationId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(applicationId, userId);

    const query = `
      UPDATE applications
      SET ${fields.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING 
        id, 
        user_id AS "userId", 
        company_name AS "companyName", 
        position, 
        status, 
        application_date AS "applicationDate", 
        location,
        job_description AS "jobDescription",
        notes, 
        source_link AS "sourceLink", 
        reminder_date AS "reminderDate", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete an application (user-scoped)
   */
  static async delete(userId: string, applicationId: string): Promise<boolean> {
    const query = `DELETE FROM applications WHERE id = $1 AND user_id = $2`;
    const result = await pool.query(query, [applicationId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Delete an application using a transaction client (user-scoped)
   */
  static async deleteWithClient(client: any, userId: string, applicationId: string): Promise<boolean> {
    const query = `DELETE FROM applications WHERE id = $1 AND user_id = $2`;
    const result = await client.query(query, [applicationId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Update application status (user-scoped)
   */
  static async updateStatus(userId: string, applicationId: string, status: string): Promise<Application | null> {
    const query = `
      UPDATE applications
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING 
        id, 
        user_id AS "userId", 
        company_name AS "companyName", 
        position, 
        status, 
        application_date AS "applicationDate", 
        location,
        job_description AS "jobDescription",
        notes, 
        source_link AS "sourceLink", 
        reminder_date AS "reminderDate", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
    `;

    const result = await pool.query(query, [status, applicationId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Count applications by user
   */
  static async countByUser(userId: string): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM applications WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Count applications by user and status
   */
  static async countByUserAndStatus(userId: string, status: string): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM applications WHERE user_id = $1 AND status = $2`;
    const result = await pool.query(query, [userId, status]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get recent applications (last N days)
   */
  static async getRecentByUser(userId: string, days: number): Promise<Application[]> {
    const query = `
      SELECT 
        id, 
        user_id AS "userId", 
        company_name AS "companyName", 
        position, 
        status, 
        application_date AS "applicationDate", 
        notes, 
        source_link AS "sourceLink", 
        reminder_date AS "reminderDate", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM applications
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId, days]);
    return result.rows;
  }

  /**
   * Map camelCase field names to snake_case database columns
   */
  private static mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      companyName: 'company_name',
      applicationDate: 'application_date',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      sourceLink: 'source_link',
      reminderDate: 'reminder_date'
    };

    return fieldMap[field] || field;
  }
}
