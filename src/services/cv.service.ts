/**
 * CV Service
 * Business logic for CV file management
 * Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 3.2
 */

import { S3Service } from './s3.service';
import { CVFileModel, CreateCVFileDTO, CVFile } from '../models/cvFile.model';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'image/png',
  'image/jpeg',
];

export class CVService {
  /**
   * Validate file before upload
   * Requirements: 2.3, 2.4
   */
  static validateFile(fileSize: number, mimeType: string): void {
    // Check file size
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed. Allowed types: PDF, DOCX, PNG, JPG`);
    }
  }

  /**
   * Upload CV file
   * Requirements: 1.1, 4.1
   */
  static async uploadCV(
    buffer: Buffer,
    originalName: string,
    userId: string,
    mimeType: string
  ): Promise<{ cvFile: CVFile; signedUrl: string }> {
    // Validate file
    this.validateFile(buffer.length, mimeType);

    // Upload to S3
    const uploadResult = await S3Service.uploadFile(buffer, originalName, userId, 'cvs');

    // Save metadata to database
    const cvFileData: CreateCVFileDTO = {
      userId,
      fileName: originalName,
      originalName,
      s3Key: uploadResult.key,
      fileSize: buffer.length,
      mimeType,
    };

    const cvFile = await CVFileModel.create(cvFileData);

    // Generate signed URL
    const signedUrl = await S3Service.getSignedUrl(uploadResult.key);

    return { cvFile, signedUrl };
  }

  /**
   * Get CV file with signed URL
   * Requirements: 1.3, 3.2
   */
  static async getCV(cvId: string, userId: string): Promise<{ cvFile: CVFile; signedUrl: string }> {
    // Get CV file metadata
    const cvFile = await CVFileModel.findById(cvId);

    if (!cvFile) {
      throw new Error('CV file not found');
    }

    // Check ownership
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }

    // Generate signed URL
    const signedUrl = await S3Service.getSignedUrl(cvFile.s3Key);

    return { cvFile, signedUrl };
  }

  /**
   * List user's CV files
   * Requirements: 2.1
   */
  static async listUserCVs(userId: string): Promise<CVFile[]> {
    return CVFileModel.findByUser(userId);
  }

  /**
   * Delete CV file
   * Requirements: 2.2, 3.2
   */
  static async deleteCV(cvId: string, userId: string): Promise<void> {
    // Get CV file metadata
    const cvFile = await CVFileModel.findById(cvId);

    if (!cvFile) {
      throw new Error('CV file not found');
    }

    // Check ownership
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }

    // Delete from S3
    await S3Service.deleteFile(cvFile.s3Key);

    // Delete from database
    await CVFileModel.delete(cvId);
  }
}
