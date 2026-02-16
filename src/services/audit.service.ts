import { AuditModel, AuditFilters } from '../models/audit.model';
import { AuditEntry, PaginatedResult } from '../types';

export class AuditService {
  /**
   * Log a CREATE action
   */
  static async logCreate(userId: string, entity: string, entityId: string, data: any): Promise<void> {
    await AuditModel.create(userId, entity, entityId, 'CREATE', undefined, data);
  }

  /**
   * Log an UPDATE action with before and after values
   */
  static async logUpdate(
    userId: string,
    entity: string,
    entityId: string,
    beforeData: any,
    afterData: any
  ): Promise<void> {
    await AuditModel.create(userId, entity, entityId, 'UPDATE', beforeData, afterData);
  }

  /**
   * Log a DELETE action
   */
  static async logDelete(userId: string, entity: string, entityId: string, data: any): Promise<void> {
    await AuditModel.create(userId, entity, entityId, 'DELETE', data, undefined);
  }

  /**
   * Get audit logs with filters (admin only) - includes user email
   */
  static async getAuditLog(filters?: AuditFilters): Promise<PaginatedResult<any>> {
    return AuditModel.findAllWithUserEmail(filters);
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLog(entity: string, entityId: string): Promise<AuditEntry[]> {
    return AuditModel.findByEntity(entity, entityId);
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLog(userId: string, limit?: number): Promise<AuditEntry[]> {
    return AuditModel.findByUser(userId, limit);
  }
}
