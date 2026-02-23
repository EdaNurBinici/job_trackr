import { AuditModel, AuditFilters } from '../models/audit.model';
import { AuditEntry, PaginatedResult } from '../types';
export class AuditService {
  static async logCreate(userId: string, entity: string, entityId: string, data: any): Promise<void> {
    await AuditModel.create(userId, entity, entityId, 'CREATE', undefined, data);
  }
  static async logUpdate(
    userId: string,
    entity: string,
    entityId: string,
    beforeData: any,
    afterData: any
  ): Promise<void> {
    await AuditModel.create(userId, entity, entityId, 'UPDATE', beforeData, afterData);
  }
  static async logDelete(userId: string, entity: string, entityId: string, data: any): Promise<void> {
    await AuditModel.create(userId, entity, entityId, 'DELETE', data, undefined);
  }
  static async getAuditLog(filters?: AuditFilters): Promise<PaginatedResult<any>> {
    return AuditModel.findAllWithUserEmail(filters);
  }
  static async getEntityAuditLog(entity: string, entityId: string): Promise<AuditEntry[]> {
    return AuditModel.findByEntity(entity, entityId);
  }
  static async getUserAuditLog(userId: string, limit?: number): Promise<AuditEntry[]> {
    return AuditModel.findByUser(userId, limit);
  }
}
