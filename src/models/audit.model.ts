import { pool } from '../config/database';
import { AuditEntry, AuditAction, PaginatedResult } from '../types';

export interface AuditFilters {
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: AuditAction;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export class AuditModel {
  /**
   * Create a new audit log entry
   */
  static async create(
    userId: string,
    entity: string,
    entityId: string,
    action: AuditAction,
    beforeData?: any,
    afterData?: any
  ): Promise<AuditEntry> {
    const query = `
      INSERT INTO audit_log (user_id, entity, entity_id, action, before_data, after_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, 
        user_id AS "userId", 
        entity, 
        entity_id AS "entityId", 
        action, 
        before_data AS "beforeData", 
        after_data AS "afterData", 
        timestamp
    `;
    
    const values = [
      userId,
      entity,
      entityId,
      action,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Create a new audit log entry using a transaction client
   */
  static async createWithClient(
    client: any,
    userId: string,
    entity: string,
    entityId: string,
    action: AuditAction,
    beforeData?: any,
    afterData?: any
  ): Promise<AuditEntry> {
    const query = `
      INSERT INTO audit_log (user_id, entity, entity_id, action, before_data, after_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, 
        user_id AS "userId", 
        entity, 
        entity_id AS "entityId", 
        action, 
        before_data AS "beforeData", 
        after_data AS "afterData", 
        timestamp
    `;
    
    const values = [
      userId,
      entity,
      entityId,
      action,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  }

  /**
   * Get audit logs with optional filters and pagination
   */
  static async findAll(filters?: AuditFilters): Promise<PaginatedResult<AuditEntry>> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // User filter
    if (filters?.userId) {
      conditions.push(`user_id = $${paramCount}`);
      values.push(filters.userId);
      paramCount++;
    }

    // Entity filter
    if (filters?.entity) {
      conditions.push(`entity = $${paramCount}`);
      values.push(filters.entity);
      paramCount++;
    }

    // Entity ID filter
    if (filters?.entityId) {
      conditions.push(`entity_id = $${paramCount}`);
      values.push(filters.entityId);
      paramCount++;
    }

    // Action filter
    if (filters?.action) {
      conditions.push(`action = $${paramCount}`);
      values.push(filters.action);
      paramCount++;
    }

    // Date range filters
    if (filters?.dateFrom) {
      conditions.push(`timestamp >= $${paramCount}`);
      values.push(filters.dateFrom);
      paramCount++;
    }

    if (filters?.dateTo) {
      conditions.push(`timestamp <= $${paramCount}`);
      values.push(filters.dateTo);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching records
    const countQuery = `SELECT COUNT(*) as count FROM audit_log ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Build pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    // Get paginated data
    const dataQuery = `
      SELECT 
        id, 
        user_id AS "userId", 
        entity, 
        entity_id AS "entityId", 
        action, 
        before_data AS "beforeData", 
        after_data AS "afterData", 
        timestamp
      FROM audit_log
      ${whereClause}
      ORDER BY timestamp DESC
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
   * Get audit logs with user email joined (for admin)
   */
  static async findAllWithUserEmail(filters?: AuditFilters): Promise<PaginatedResult<any>> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // User filter
    if (filters?.userId) {
      conditions.push(`a.user_id = $${paramCount}`);
      values.push(filters.userId);
      paramCount++;
    }

    // Entity filter
    if (filters?.entity) {
      conditions.push(`a.entity = $${paramCount}`);
      values.push(filters.entity);
      paramCount++;
    }

    // Entity ID filter
    if (filters?.entityId) {
      conditions.push(`a.entity_id = $${paramCount}`);
      values.push(filters.entityId);
      paramCount++;
    }

    // Action filter
    if (filters?.action) {
      conditions.push(`a.action = $${paramCount}`);
      values.push(filters.action);
      paramCount++;
    }

    // Date range filters
    if (filters?.dateFrom) {
      conditions.push(`a.timestamp >= $${paramCount}`);
      values.push(filters.dateFrom);
      paramCount++;
    }

    if (filters?.dateTo) {
      conditions.push(`a.timestamp <= $${paramCount}`);
      values.push(filters.dateTo);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching records
    const countQuery = `SELECT COUNT(*) as count FROM audit_log a ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Build pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    // Get paginated data with user email
    const dataQuery = `
      SELECT
        a.id,
        a.user_id AS "userId",
        u.email AS "userEmail",
        a.entity AS "entityType",
        a.entity_id AS "entityId",
        a.action,
        a.before_data AS "before",
        a.after_data AS "after",
        a.timestamp AS "createdAt"
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.timestamp DESC
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
   * Get audit logs for a specific entity
   */
  static async findByEntity(entity: string, entityId: string): Promise<AuditEntry[]> {
    const query = `
      SELECT 
        id, 
        user_id AS "userId", 
        entity, 
        entity_id AS "entityId", 
        action, 
        before_data AS "beforeData", 
        after_data AS "afterData", 
        timestamp
      FROM audit_log
      WHERE entity = $1 AND entity_id = $2
      ORDER BY timestamp DESC
    `;

    const result = await pool.query(query, [entity, entityId]);
    return result.rows;
  }

  /**
   * Get audit logs for a specific user
   */
  static async findByUser(userId: string, limit?: number): Promise<AuditEntry[]> {
    const limitClause = limit ? `LIMIT $2` : '';
    const query = `
      SELECT 
        id, 
        user_id AS "userId", 
        entity, 
        entity_id AS "entityId", 
        action, 
        before_data AS "beforeData", 
        after_data AS "afterData", 
        timestamp
      FROM audit_log
      WHERE user_id = $1
      ORDER BY timestamp DESC
      ${limitClause}
    `;

    const params = limit ? [userId, limit] : [userId];
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get audit logs with user email joined (for admin)
   */
  static async findAllWithUserEmail(filters?: AuditFilters): Promise<PaginatedResult<any>> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // User filter
    if (filters?.userId) {
      conditions.push(`a.user_id = $${paramCount}`);
      values.push(filters.userId);
      paramCount++;
    }

    // Entity filter
    if (filters?.entity) {
      conditions.push(`a.entity = $${paramCount}`);
      values.push(filters.entity);
      paramCount++;
    }

    // Entity ID filter
    if (filters?.entityId) {
      conditions.push(`a.entity_id = $${paramCount}`);
      values.push(filters.entityId);
      paramCount++;
    }

    // Action filter
    if (filters?.action) {
      conditions.push(`a.action = $${paramCount}`);
      values.push(filters.action);
      paramCount++;
    }

    // Date range filters
    if (filters?.dateFrom) {
      conditions.push(`a.timestamp >= $${paramCount}`);
      values.push(filters.dateFrom);
      paramCount++;
    }

    if (filters?.dateTo) {
      conditions.push(`a.timestamp <= $${paramCount}`);
      values.push(filters.dateTo);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching records
    const countQuery = `SELECT COUNT(*) as count FROM audit_log a ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Build pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    // Get paginated data with user email
    const dataQuery = `
      SELECT 
        a.id, 
        a.user_id AS "userId", 
        u.email AS "userEmail",
        a.entity AS "entityType",
        a.entity_id AS "entityId", 
        a.action, 
        a.before_data AS "before", 
        a.after_data AS "after", 
        a.timestamp AS "createdAt"
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.timestamp DESC
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
   * Count total audit entries
   */
  static async count(): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM audit_log`;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10);
  }
}
