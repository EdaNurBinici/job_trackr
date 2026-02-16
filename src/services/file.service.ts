import { FileModel } from '../models';
import { CVFileModel } from '../models/cvFile.model';
import { FileMetadata } from '../types';
import { S3Service } from './s3.service';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_MIME_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];

export interface FileUpload {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export class FileService {
  /**
   * Validate file type
   * Requirements: 2.3, 2.4
   */
  private static validateFileType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Invalid file type. Allowed types: PDF, DOCX, PNG, JPG. Received: ${mimeType}`);
    }
  }

  /**
   * Validate file size
   * Requirements: 2.3
   */
  private static validateFileSize(size: number): void {
    if (size > MAX_FILE_SIZE) {
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      throw new Error(`File size exceeds maximum allowed size. File size: ${sizeMB}MB, Maximum: ${maxSizeMB}MB`);
    }
  }

  /**
   * Validate file
   * Requirements: 2.3, 2.4
   */
  static validateFile(file: FileUpload): void {
    this.validateFileType(file.mimeType);
    this.validateFileSize(file.size);
  }

  /**
   * Upload a file to S3 and store metadata
   * Requirements: 1.1, 1.2, 1.4, 1.5, 2.1
   */
  static async upload(
    userId: string,
    applicationId: string,
    file: FileUpload
  ): Promise<FileMetadata> {
    // Validate file
    this.validateFile(file);

    // Upload to S3
    const uploadResult = await S3Service.uploadFile(
      file.buffer,
      file.originalName,
      userId,
      'application-files'
    );

    // Store metadata in database using FileModel (for backward compatibility)
    const fileMetadata = await FileModel.create(
      applicationId,
      file.originalName,
      file.size,
      file.mimeType,
      uploadResult.key // Store S3 key as storage path
    );

    return fileMetadata;
  }

  /**
   * Get signed URL for file download
   * Requirements: 1.3, 3.1
   */
  static async download(_userId: string, fileId: string): Promise<{ url: string; fileName: string }> {
    const fileMetadata = await FileModel.findById(fileId);
    
    if (!fileMetadata) {
      throw new Error('File not found');
    }

    // Get signed URL from S3 (valid for 1 hour)
    const signedUrl = await S3Service.getSignedUrl(fileMetadata.storagePath, 3600);

    return {
      url: signedUrl,
      fileName: fileMetadata.fileName
    };
  }

  /**
   * Delete a file from S3 and database
   * Requirements: 2.2, 3.2
   */
  static async delete(_userId: string, fileId: string): Promise<void> {
    const fileMetadata = await FileModel.findById(fileId);
    
    if (!fileMetadata) {
      throw new Error('File not found');
    }

    // Delete file from S3
    try {
      await S3Service.deleteFile(fileMetadata.storagePath);
    } catch (error) {
      console.error(`Failed to delete file from S3: ${fileMetadata.storagePath}`, error);
      // Continue to delete metadata even if S3 deletion fails
    }

    // Delete metadata from database
    await FileModel.delete(fileId);
  }

  /**
   * Delete all files for an application from S3 and database
   * Requirements: 2.2
   */
  static async deleteByApplication(applicationId: string): Promise<void> {
    const files = await FileModel.findByApplication(applicationId);

    // Delete all files from S3
    for (const file of files) {
      try {
        await S3Service.deleteFile(file.storagePath);
      } catch (error) {
        console.error(`Failed to delete file from S3: ${file.storagePath}`, error);
        // Continue with other files
      }
    }

    // Delete all metadata from database
    await FileModel.deleteByApplication(applicationId);
  }

  /**
   * Get all files for an application
   * Requirements: 2.1
   */
  static async getByApplication(applicationId: string): Promise<FileMetadata[]> {
    return FileModel.findByApplication(applicationId);
  }

  /**
   * Upload CV file to S3 and store metadata in cv_files table
   * Requirements: 1.1, 1.4, 1.5, 2.1
   */
  static async uploadCV(
    userId: string,
    file: FileUpload
  ): Promise<any> {
    // Validate file
    this.validateFile(file);

    // Upload to S3
    const uploadResult = await S3Service.uploadFile(
      file.buffer,
      file.originalName,
      userId,
      'cvs'
    );

    // Store metadata in cv_files table
    const cvFile = await CVFileModel.create({
      userId,
      fileName: uploadResult.key.split('/').pop() || file.originalName,
      originalName: file.originalName,
      s3Key: uploadResult.key,
      fileSize: file.size,
      mimeType: file.mimeType,
    });

    return cvFile;
  }

  /**
   * Get signed URL for CV file download
   * Requirements: 1.3, 3.1, 3.2
   */
  static async downloadCV(userId: string, fileId: string): Promise<{ url: string; fileName: string }> {
    const cvFile = await CVFileModel.findById(fileId);
    
    if (!cvFile) {
      throw new Error('CV file not found');
    }

    // Check ownership
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }

    // Get signed URL from S3 (valid for 1 hour)
    const signedUrl = await S3Service.getSignedUrl(cvFile.s3Key, 3600);

    return {
      url: signedUrl,
      fileName: cvFile.originalName
    };
  }

  /**
   * Delete CV file from S3 and database
   * Requirements: 2.2, 3.2
   */
  static async deleteCV(userId: string, fileId: string): Promise<void> {
    const cvFile = await CVFileModel.findById(fileId);
    
    if (!cvFile) {
      throw new Error('CV file not found');
    }

    // Check ownership
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }

    // Delete file from S3
    try {
      await S3Service.deleteFile(cvFile.s3Key);
    } catch (error) {
      console.error(`Failed to delete CV file from S3: ${cvFile.s3Key}`, error);
      // Continue to delete metadata even if S3 deletion fails
    }

    // Delete metadata from database
    await CVFileModel.delete(fileId);
  }

  /**
   * Get all CV files for a user
   * Requirements: 2.1, 3.2
   */
  static async getUserCVs(userId: string): Promise<any[]> {
    return CVFileModel.findByUser(userId);
  }
}
