import { FileModel } from '../models';
import { CVFileModel } from '../models/cvFile.model';
import { FileMetadata } from '../types';
import { S3Service } from './s3.service';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_MIME_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
export interface FileUpload {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}
export class FileService {
  private static validateFileType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Invalid file type. Allowed types: PDF, DOCX, PNG, JPG. Received: ${mimeType}`);
    }
  }
  private static validateFileSize(size: number): void {
    if (size > MAX_FILE_SIZE) {
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      throw new Error(`File size exceeds maximum allowed size. File size: ${sizeMB}MB, Maximum: ${maxSizeMB}MB`);
    }
  }
  static validateFile(file: FileUpload): void {
    this.validateFileType(file.mimeType);
    this.validateFileSize(file.size);
  }
  static async upload(
    userId: string,
    applicationId: string,
    file: FileUpload
  ): Promise<FileMetadata> {
    this.validateFile(file);
    const uploadResult = await S3Service.uploadFile(
      file.buffer,
      file.originalName,
      userId,
      'application-files'
    );
    const fileMetadata = await FileModel.create(
      applicationId,
      file.originalName,
      file.size,
      file.mimeType,
      uploadResult.key // Store S3 key as storage path
    );
    return fileMetadata;
  }
  static async download(_userId: string, fileId: string): Promise<{ url: string; fileName: string }> {
    const fileMetadata = await FileModel.findById(fileId);
    if (!fileMetadata) {
      throw new Error('File not found');
    }
    const signedUrl = await S3Service.getSignedUrl(fileMetadata.storagePath, 3600);
    return {
      url: signedUrl,
      fileName: fileMetadata.fileName
    };
  }
  static async delete(_userId: string, fileId: string): Promise<void> {
    const fileMetadata = await FileModel.findById(fileId);
    if (!fileMetadata) {
      throw new Error('File not found');
    }
    try {
      await S3Service.deleteFile(fileMetadata.storagePath);
    } catch (error) {
      console.error(`Failed to delete file from S3: ${fileMetadata.storagePath}`, error);
    }
    await FileModel.delete(fileId);
  }
  static async deleteByApplication(applicationId: string): Promise<void> {
    const files = await FileModel.findByApplication(applicationId);
    for (const file of files) {
      try {
        await S3Service.deleteFile(file.storagePath);
      } catch (error) {
        console.error(`Failed to delete file from S3: ${file.storagePath}`, error);
      }
    }
    await FileModel.deleteByApplication(applicationId);
  }
  static async getByApplication(applicationId: string): Promise<FileMetadata[]> {
    return FileModel.findByApplication(applicationId);
  }
  static async uploadCV(
    userId: string,
    file: FileUpload
  ): Promise<any> {
    this.validateFile(file);
    const uploadResult = await S3Service.uploadFile(
      file.buffer,
      file.originalName,
      userId,
      'cvs'
    );
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
  static async downloadCV(userId: string, fileId: string): Promise<{ url: string; fileName: string }> {
    const cvFile = await CVFileModel.findById(fileId);
    if (!cvFile) {
      throw new Error('CV file not found');
    }
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }
    const signedUrl = await S3Service.getSignedUrl(cvFile.s3Key, 3600);
    return {
      url: signedUrl,
      fileName: cvFile.originalName
    };
  }
  static async deleteCV(userId: string, fileId: string): Promise<void> {
    const cvFile = await CVFileModel.findById(fileId);
    if (!cvFile) {
      throw new Error('CV file not found');
    }
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }
    try {
      await S3Service.deleteFile(cvFile.s3Key);
    } catch (error) {
      console.error(`Failed to delete CV file from S3: ${cvFile.s3Key}`, error);
    }
    await CVFileModel.delete(fileId);
  }
  static async getUserCVs(userId: string): Promise<any[]> {
    return CVFileModel.findByUser(userId);
  }
}
