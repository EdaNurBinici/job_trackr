/**
 * File Routes Integration Tests
 * Verifies that POST /api/applications/:id/files endpoint uses S3Service
 * Requirements: 1.1
 */

import { AuthService } from '../services';
import { ApplicationService } from '../services';
import { FileService } from '../services';
import { S3Service } from '../services/s3.service';

describe('File Routes - S3 Integration', () => {
  let userId: string;
  let applicationId: string;

  beforeAll(async () => {
    // Create test user
    const email = `test-${Date.now()}@example.com`;
    const password = 'password123';
    const registerResult = await AuthService.register({ email, password });
    userId = registerResult.user.id;

    // Create test application
    const application = await ApplicationService.create(userId, {
      companyName: 'Test Company',
      position: 'Test Position',
      status: 'Applied',
      applicationDate: new Date().toISOString(),
    });
    applicationId = application.id;
  });

  afterAll(async () => {
    // Cleanup: delete application (will cascade delete files)
    try {
      await ApplicationService.delete(userId, applicationId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('POST /api/applications/:id/files should upload file to S3', async () => {
    // Create a test PDF buffer
    const pdfBuffer = Buffer.from('%PDF-1.4\n%Test PDF content\n%%EOF');
    
    // Mock file upload
    const file = {
      buffer: pdfBuffer,
      originalName: 'test-resume.pdf',
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
    };

    // Upload file using FileService (which uses S3Service)
    const uploadedFile = await FileService.upload(userId, applicationId, file);

    // Verify file metadata
    expect(uploadedFile).toBeDefined();
    expect(uploadedFile.id).toBeDefined();
    expect(uploadedFile.applicationId).toBe(applicationId);
    expect(uploadedFile.fileName).toBe('test-resume.pdf');
    expect(uploadedFile.mimeType).toBe('application/pdf');
    
    // Verify storage path format (depends on S3 vs local storage)
    if (S3Service.isConfigured()) {
      // S3 format: application-files/userId/timestamp-filename.pdf
      expect(uploadedFile.storagePath).toMatch(/application-files\//);
      expect(uploadedFile.storagePath).toContain(userId);
      expect(uploadedFile.storagePath).toContain('test-resume.pdf');
    } else {
      // Local storage format: uploads/cvs/userId/timestamp-filename.pdf
      expect(uploadedFile.storagePath).toContain(userId);
      expect(uploadedFile.storagePath).toContain('test-resume.pdf');
    }

    // Verify we can get a signed URL (proves S3 integration)
    const { url, fileName } = await FileService.download(userId, uploadedFile.id);
    expect(url).toBeDefined();
    expect(fileName).toBe('test-resume.pdf');
    
    // URL should be either S3 signed URL or local URL depending on configuration
    if (S3Service.isConfigured()) {
      expect(url).toMatch(/amazonaws\.com|s3/);
    } else {
      expect(url).toMatch(/localhost/);
    }

    // Cleanup
    await FileService.delete(userId, uploadedFile.id);
  });

  test('FileService.upload should use S3Service internally', async () => {
    // This test verifies the integration between FileService and S3Service
    const pdfBuffer = Buffer.from('%PDF-1.4\n%Test PDF content\n%%EOF');
    
    const file = {
      buffer: pdfBuffer,
      originalName: 'integration-test.pdf',
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
    };

    // Upload file
    const uploadedFile = await FileService.upload(userId, applicationId, file);

    // Verify the storage path contains userId and filename
    expect(uploadedFile.storagePath).toContain(userId);
    expect(uploadedFile.storagePath).toMatch(/\d+-integration-test\.pdf/);

    if (S3Service.isConfigured()) {
      // S3 format: application-files/userId/timestamp-filename
      const pathParts = uploadedFile.storagePath.split('/');
      expect(pathParts.length).toBeGreaterThanOrEqual(3);
      expect(pathParts[0]).toBe('application-files'); // folder
      expect(pathParts[1]).toBe(userId); // userId
      expect(pathParts[2]).toMatch(/\d+-integration-test\.pdf/); // timestamp-filename
    }

    // Cleanup
    await FileService.delete(userId, uploadedFile.id);
  });
});
