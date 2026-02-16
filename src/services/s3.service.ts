/**
 * AWS S3 Service
 * Handles file upload, download, and deletion from AWS S3
 * Requirements: 1.1, 1.3, 2.2, 3.1
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { lookup } from 'mime-types';
import { writeFile, unlink, readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Check if S3 is configured
const isS3Configured = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET
);

// S3 Client Configuration (only if configured)
const s3Client = isS3Configured ? new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
}) : null;

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'jobtrackr-files';
const LOCAL_STORAGE_PATH = './uploads/cvs';

// Ensure local storage directory exists
if (!isS3Configured && !existsSync(LOCAL_STORAGE_PATH)) {
  mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
}

export class S3Service {
  /**
   * Upload file to S3 or local storage
   * Requirements: 1.1, 1.4, 1.5
   */
  static async uploadFile(
    buffer: Buffer,
    fileName: string,
    userId: string,
    folder: string = 'files'
  ): Promise<UploadResult> {
    try {
      // Generate unique key
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `${folder}/${userId}/${timestamp}-${sanitizedFileName}`;

      // Detect content type
      const contentType = lookup(fileName) || 'application/octet-stream';

      if (isS3Configured && s3Client) {
        // Upload to S3
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        });

        await s3Client.send(command);

        // Generate public URL (not signed, just for reference)
        const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        return {
          key,
          bucket: BUCKET_NAME,
          url,
        };
      } else {
        // Upload to local storage
        const userFolder = join(LOCAL_STORAGE_PATH, userId);
        if (!existsSync(userFolder)) {
          mkdirSync(userFolder, { recursive: true });
        }
        
        const localFileName = `${timestamp}-${sanitizedFileName}`;
        const localPath = join(userFolder, localFileName);
        await writeFile(localPath, buffer);

        return {
          key: localPath,
          bucket: 'local',
          url: `http://localhost:${process.env.PORT || 3001}/uploads/cvs/${userId}/${localFileName}`,
        };
      }
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Get signed URL for secure file access
   * Requirements: 1.3, 3.1
   */
  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      if (isS3Configured && s3Client) {
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });

        // Generate signed URL (valid for 1 hour by default)
        const signedUrl = await getSignedUrl(s3Client, command as any, { expiresIn });

        return signedUrl;
      } else {
        // For local storage, extract path components
        // key format: uploads/cvs/userId/timestamp-filename.pdf
        const pathParts = key.split(/[/\\]/);
        const userId = pathParts[pathParts.length - 2];
        const fileName = pathParts[pathParts.length - 1];
        
        return `http://localhost:${process.env.PORT || 3001}/uploads/cvs/${userId}/${fileName}`;
      }
    } catch (error) {
      console.error('Signed URL error:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Delete file from S3 or local storage
   * Requirements: 2.2
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      if (isS3Configured && s3Client) {
        const command = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });

        await s3Client.send(command);
      } else {
        // Delete from local storage
        if (existsSync(key)) {
          await unlink(key);
        }
      }
    } catch (error) {
      console.error('File delete error:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * List files for a user
   * Requirements: 2.1
   */
  static async listUserFiles(userId: string, folder: string = 'files'): Promise<string[]> {
    try {
      if (isS3Configured && s3Client) {
        const command = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: `${folder}/${userId}/`,
        });

        const response = await s3Client.send(command);
        
        return response.Contents?.map(item => item.Key!) || [];
      } else {
        // List from local storage
        const userFolder = join(LOCAL_STORAGE_PATH, userId);
        
        if (!existsSync(userFolder)) {
          return [];
        }
        
        const files = await readdir(userFolder);
        return files.map(f => join(userFolder, f));
      }
    } catch (error) {
      console.error('File list error:', error);
      throw new Error('Failed to list files');
    }
  }

  /**
   * Get file as Buffer from S3 or local storage
   * Used by CV analysis, cover letter, etc.
   */
  static async getFileBuffer(key: string): Promise<Buffer> {
    try {
      if (isS3Configured && s3Client) {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });
        const response = await s3Client.send(command);
        const stream = response.Body;
        if (!stream) throw new Error('Empty S3 response');
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      } else {
        // Local storage - resolve path (key might be relative, normalize Windows \ to /)
        const path = await import('path');
        const normalizedKey = key.replace(/\\/g, '/');
        const filePath = path.isAbsolute(normalizedKey) ? normalizedKey : path.join(process.cwd(), normalizedKey);
        return await readFile(filePath);
      }
    } catch (error: any) {
      if (error?.code === 'ENOENT' && process.env.NODE_ENV === 'production') {
        console.error('File not found (Railway/ephemeral filesystem?). Configure AWS S3 or use Railway Volumes for uploads.');
      }
      throw error;
    }
  }

  /**
   * Check if S3 is configured
   */
  static isConfigured(): boolean {
    return isS3Configured;
  }
}
