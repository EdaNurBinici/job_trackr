import fc from 'fast-check';
import { FileService, FileUpload } from '../services/file.service';
import { pool } from '../config/database';
import { UserModel, ApplicationModel } from '../models';
import { FileMetadata } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Test helpers
const createTestUser = async () => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  return UserModel.create(email, 'password123', 'user');
};

const createTestApplication = async (userId: string) => {
  return ApplicationModel.create(userId, {
    companyName: 'Test Company',
    position: 'Test Position',
    status: 'Applied',
    applicationDate: new Date().toISOString().split('T')[0]
  });
};

const cleanupTestFiles = async () => {
  const uploadDir = 'uploads';
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(uploadDir, file));
      } catch (error) {
        // Ignore errors
      }
    }
  }
};

// Cleanup before and after tests
beforeAll(async () => {
  await cleanupTestFiles();
});

afterEach(async () => {
  await pool.query('DELETE FROM files');
  await pool.query('DELETE FROM applications');
  await pool.query('DELETE FROM audit_log');
  await pool.query('DELETE FROM users');
  await cleanupTestFiles();
});

afterAll(async () => {
  await cleanupTestFiles();
  // Close database connection pool
  await pool.end();
}, 10000); // Increase timeout for cleanup

describe('File Service Property Tests', () => {
  /**
   * Property 31: File upload round-trip
   * **Validates: Requirements 8.1, 8.5**
   */
  test('Property 31: File upload round-trip', async () => {
    const user = await createTestUser();
    const application = await createTestApplication(user.id);

    // Generate valid file sizes (1KB to 1MB for faster tests)
    const validSizes = fc.integer({ min: 1024, max: 1024 * 1024 });

    await fc.assert(
      fc.asyncProperty(
        validSizes,
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.uint8Array({ minLength: 100, maxLength: 1000 }),
        async (fileSize, fileName, contentPattern) => {
          // Create file content by repeating pattern to reach desired size
          const repeatCount = Math.ceil(fileSize / contentPattern.length);
          const fullContent = Buffer.concat(
            Array(repeatCount).fill(Buffer.from(contentPattern))
          ).slice(0, fileSize);

          const file: FileUpload = {
            buffer: fullContent,
            originalName: fileName + '.pdf',
            mimeType: 'application/pdf',
            size: fileSize
          };

          // Upload file
          const uploadedFile = await FileService.upload(user.id, application.id, file);

          // Verify file metadata
          expect(uploadedFile).toBeDefined();
          expect(uploadedFile.id).toBeDefined();
          expect(uploadedFile.applicationId).toBe(application.id);
          expect(uploadedFile.fileName).toBe(fileName + '.pdf');
          expect(uploadedFile.fileSize).toBe(fileSize);
          expect(uploadedFile.mimeType).toBe('application/pdf');

          // Get signed URL for download
          const { url, fileName: downloadedFileName } = await FileService.download(user.id, uploadedFile.id);

          // Verify signed URL is returned
          expect(url).toBeDefined();
          expect(typeof url).toBe('string');
          expect(url.length).toBeGreaterThan(0);
          expect(downloadedFileName).toBe(fileName + '.pdf');

          // Cleanup
          await FileService.delete(user.id, uploadedFile.id);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property 32: Non-PDF files rejected
   * **Validates: Requirements 8.2**
   */
  test('Property 32: Non-PDF files rejected', async () => {
    const user = await createTestUser();
    const application = await createTestApplication(user.id);

    // Generate non-allowed MIME types (excluding PDF, DOCX, PNG, JPG)
    const nonAllowedMimeTypes = fc.constantFrom(
      'image/gif',
      'text/plain',
      'text/html',
      'application/json',
      'application/xml',
      'application/zip',
      'video/mp4',
      'audio/mpeg'
    );

    await fc.assert(
      fc.asyncProperty(
        nonAllowedMimeTypes,
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.uint8Array({ minLength: 1, maxLength: 1000 }),
        async (mimeType, fileName, fileData) => {
          const file: FileUpload = {
            buffer: Buffer.from(fileData),
            originalName: fileName,
            mimeType: mimeType,
            size: fileData.length
          };

          // Attempt to upload non-allowed file
          await expect(
            FileService.upload(user.id, application.id, file)
          ).rejects.toThrow(/Invalid file type.*Allowed types: PDF, DOCX, PNG, JPG/);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * Property 33: Large files rejected
   * **Validates: Requirements 8.3**
   */
  test('Property 33: Large files rejected', async () => {
    const user = await createTestUser();
    const application = await createTestApplication(user.id);

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    // Generate file sizes larger than 10MB
    const largeSizes = fc.integer({ min: MAX_SIZE + 1, max: MAX_SIZE + 5 * 1024 * 1024 });

    await fc.assert(
      fc.asyncProperty(
        largeSizes,
        fc.string({ minLength: 1, maxLength: 50 }),
        async (fileSize, fileName) => {
          const file: FileUpload = {
            buffer: Buffer.alloc(fileSize), // Create a buffer of the specified size
            originalName: fileName,
            mimeType: 'application/pdf',
            size: fileSize
          };

          // Attempt to upload large file
          await expect(
            FileService.upload(user.id, application.id, file)
          ).rejects.toThrow(/File size exceeds maximum allowed size/);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * Edge case: Files exactly at 10MB limit should be accepted
   */
  test('Files exactly at 10MB limit should be accepted', async () => {
    const user = await createTestUser();
    const application = await createTestApplication(user.id);

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB exactly

    const file: FileUpload = {
      buffer: Buffer.alloc(MAX_SIZE),
      originalName: 'max-size-file.pdf',
      mimeType: 'application/pdf',
      size: MAX_SIZE
    };

    // Upload should succeed
    const result = await FileService.upload(user.id, application.id, file);

    // Verify file metadata
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.fileSize).toBe(MAX_SIZE);

    // Cleanup
    await FileService.delete(user.id, result.id);
  }, 30000);

  /**
   * Additional test: Valid file types (PDF, DOCX, PNG, JPG) within size limit are accepted
   */
  test('Valid file types (PDF, DOCX, PNG, JPG) within size limit are accepted', async () => {
    const user = await createTestUser();
    const application = await createTestApplication(user.id);

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    // Generate valid file sizes (1KB to 10MB)
    const validSizes = fc.integer({ min: 1024, max: MAX_SIZE });

    // Test all allowed file types
    const allowedFileTypes = fc.constantFrom(
      { mimeType: 'application/pdf', extension: '.pdf' },
      { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx' },
      { mimeType: 'image/png', extension: '.png' },
      { mimeType: 'image/jpeg', extension: '.jpg' }
    );

    await fc.assert(
      fc.asyncProperty(
        validSizes,
        fc.string({ minLength: 1, maxLength: 50 }),
        allowedFileTypes,
        async (fileSize, fileName, fileType) => {
          const file: FileUpload = {
            buffer: Buffer.alloc(fileSize),
            originalName: fileName + fileType.extension,
            mimeType: fileType.mimeType,
            size: fileSize
          };

          // Upload should succeed
          const result = await FileService.upload(user.id, application.id, file);

          // Verify file metadata
          expect(result).toBeDefined();
          expect(result.id).toBeDefined();
          expect(result.applicationId).toBe(application.id);
          expect(result.fileName).toBe(fileName + fileType.extension);
          expect(result.fileSize).toBe(fileSize);
          expect(result.mimeType).toBe(fileType.mimeType);

          // Cleanup
          await FileService.delete(user.id, result.id);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property 10: Application deletion removes all data
   * **Validates: Requirements 2.4, 8.6**
   */
  test('Property 10: Application deletion removes all data', async () => {
    const user = await createTestUser();

    // Generate 1-5 files per application
    const fileCount = fc.integer({ min: 1, max: 5 });

    await fc.assert(
      fc.asyncProperty(
        fileCount,
        async (numFiles) => {
          // Create application
          const application = await createTestApplication(user.id);

          // Upload multiple files
          const uploadedFiles: FileMetadata[] = [];

          for (let i = 0; i < numFiles; i++) {
            const file: FileUpload = {
              buffer: Buffer.from(`Test content ${i}`),
              originalName: `test-file-${i}.pdf`,
              mimeType: 'application/pdf',
              size: 100 + i
            };

            const uploaded = await FileService.upload(user.id, application.id, file);
            uploadedFiles.push(uploaded);
          }

          // Verify files exist in database
          const filesBeforeDelete = await FileService.getByApplication(application.id);
          expect(filesBeforeDelete.length).toBe(numFiles);

          // Delete application (should cascade delete files)
          const { ApplicationService } = await import('../services/application.service');
          await ApplicationService.delete(user.id, application.id);

          // Verify files are deleted from database
          const filesAfterDelete = await FileService.getByApplication(application.id);
          expect(filesAfterDelete.length).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);
});
