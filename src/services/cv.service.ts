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
  static validateFile(fileSize: number, mimeType: string): void {
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed. Allowed types: PDF, DOCX, PNG, JPG`);
    }
  }
  static async uploadCV(
    buffer: Buffer,
    originalName: string,
    userId: string,
    mimeType: string
  ): Promise<{ cvFile: CVFile; signedUrl: string }> {
    this.validateFile(buffer.length, mimeType);
    const uploadResult = await S3Service.uploadFile(buffer, originalName, userId, 'cvs');
    const cvFileData: CreateCVFileDTO = {
      userId,
      fileName: originalName,
      originalName,
      s3Key: uploadResult.key,
      fileSize: buffer.length,
      mimeType,
    };
    const cvFile = await CVFileModel.create(cvFileData);
    const signedUrl = await S3Service.getSignedUrl(uploadResult.key);
    return { cvFile, signedUrl };
  }
  static async getCV(cvId: string, userId: string): Promise<{ cvFile: CVFile; signedUrl: string }> {
    const cvFile = await CVFileModel.findById(cvId);
    if (!cvFile) {
      throw new Error('CV file not found');
    }
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }
    const signedUrl = await S3Service.getSignedUrl(cvFile.s3Key);
    return { cvFile, signedUrl };
  }
  static async listUserCVs(userId: string): Promise<CVFile[]> {
    return CVFileModel.findByUser(userId);
  }
  static async deleteCV(cvId: string, userId: string): Promise<void> {
    const cvFile = await CVFileModel.findById(cvId);
    if (!cvFile) {
      throw new Error('CV file not found');
    }
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }
    await S3Service.deleteFile(cvFile.s3Key);
    await CVFileModel.delete(cvId);
  }
}
