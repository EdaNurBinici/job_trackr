import { ApplicationModel } from '../models';
import { Application, CreateApplicationDTO, UpdateApplicationDTO, ApplicationFilters, PaginatedResult, ApplicationStatus } from '../types';
import { AuditService } from './audit.service';
import { FileService } from './file.service';
import { withTransaction } from '../config/database';
export class ApplicationService {
  private static validateCreateData(data: CreateApplicationDTO): void {
    if (!data.companyName || data.companyName.trim() === '') {
      throw new Error('Company name is required');
    }
    if (!data.position || data.position.trim() === '') {
      throw new Error('Position is required');
    }
    if (!data.status) {
      throw new Error('Status is required');
    }
    if (!data.applicationDate) {
      throw new Error('Application date is required');
    }
    this.validateStatus(data.status);
    this.validateDate(data.applicationDate);
    if (data.reminderDate) {
      this.validateDate(data.reminderDate);
    }
  }
  private static validateStatus(status: string): void {
    const validStatuses: ApplicationStatus[] = ['Applied', 'Interview', 'Offer', 'Rejected'];
    if (!validStatuses.includes(status as ApplicationStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }
  private static validateDate(dateString: string): void {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
    }
  }
  static async create(userId: string, data: CreateApplicationDTO): Promise<Application> {
    this.validateCreateData(data);
    const application = await ApplicationModel.create(userId, data);
    await AuditService.logCreate(userId, 'application', application.id, application);
    return application;
  }
  static async getById(userId: string, applicationId: string): Promise<Application> {
    const application = await ApplicationModel.findById(userId, applicationId);
    if (!application) {
      throw new Error('Application not found');
    }
    return application;
  }
  static async getAll(userId: string, filters?: ApplicationFilters): Promise<PaginatedResult<Application>> {
    if (filters?.status) {
      this.validateStatus(filters.status);
    }
    if (filters?.dateFrom) {
      this.validateDate(filters.dateFrom);
    }
    if (filters?.dateTo) {
      this.validateDate(filters.dateTo);
    }
    return ApplicationModel.findAll(userId, filters);
  }
  static async update(userId: string, applicationId: string, data: UpdateApplicationDTO): Promise<Application> {
    if (data.status) {
      this.validateStatus(data.status);
    }
    if (data.applicationDate) {
      this.validateDate(data.applicationDate);
    }
    if (data.reminderDate) {
      this.validateDate(data.reminderDate);
    }
    if (data.companyName !== undefined && data.companyName.trim() === '') {
      throw new Error('Company name cannot be empty');
    }
    if (data.position !== undefined && data.position.trim() === '') {
      throw new Error('Position cannot be empty');
    }
    const beforeData = await ApplicationModel.findById(userId, applicationId);
    if (!beforeData) {
      throw new Error('Application not found');
    }
    const application = await ApplicationModel.update(userId, applicationId, data);
    if (!application) {
      throw new Error('Application not found');
    }
    await AuditService.logUpdate(userId, 'application', applicationId, beforeData, application);
    return application;
  }
  static async delete(userId: string, applicationId: string): Promise<void> {
    await withTransaction(async (client) => {
      const application = await ApplicationModel.findById(userId, applicationId);
      if (!application) {
        throw new Error('Application not found');
      }
      const files = await FileService.getByApplication(applicationId);
      const { FileModel } = await import('../models/file.model');
      await FileModel.deleteByApplicationWithClient(client, applicationId);
      const deleted = await ApplicationModel.deleteWithClient(client, userId, applicationId);
      if (!deleted) {
        throw new Error('Application not found');
      }
      const { AuditModel } = await import('../models/audit.model');
      await AuditModel.createWithClient(client, userId, 'application', applicationId, 'DELETE', application, undefined);
      const { S3Service } = await import('./s3.service');
      for (const file of files) {
        try {
          await S3Service.deleteFile(file.storagePath);
        } catch (error) {
          console.error(`Failed to delete file from S3: ${file.storagePath}`, error);
        }
      }
    });
  }
  static async updateStatus(userId: string, applicationId: string, status: ApplicationStatus): Promise<Application> {
    this.validateStatus(status);
    const beforeData = await ApplicationModel.findById(userId, applicationId);
    if (!beforeData) {
      throw new Error('Application not found');
    }
    const application = await ApplicationModel.updateStatus(userId, applicationId, status);
    if (!application) {
      throw new Error('Application not found');
    }
    await AuditService.logUpdate(userId, 'application', applicationId, beforeData, application);
    return application;
  }
  static async getUserStats(userId: string) {
    const totalApplications = await ApplicationModel.countByUser(userId);
    const interviewCount = await ApplicationModel.countByUserAndStatus(userId, 'Interview');
    const offerCount = await ApplicationModel.countByUserAndStatus(userId, 'Offer');
    const rejectedCount = await ApplicationModel.countByUserAndStatus(userId, 'Rejected');
    return {
      total: totalApplications,
      interview: interviewCount,
      offer: offerCount,
      rejected: rejectedCount
    };
  }
  static async getRecentActivity(userId: string, days: number = 7) {
    return ApplicationModel.getRecentByUser(userId, days);
  }
}
