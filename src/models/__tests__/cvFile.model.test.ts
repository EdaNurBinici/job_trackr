import { CVFileModel, CreateCVFileDTO } from '../cvFile.model';
import { UserModel } from '../user.model';
import { pool } from '../../config/database';

describe('CVFileModel', () => {
  let testUserId: string;
  let testUserId2: string;

  beforeAll(async () => {
    // Create test users
    const user1 = await UserModel.create(`cvtest1-${Date.now()}@example.com`, 'password123');
    const user2 = await UserModel.create(`cvtest2-${Date.now()}@example.com`, 'password123');
    testUserId = user1.id;
    testUserId2 = user2.id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM cv_files WHERE user_id = $1 OR user_id = $2', [testUserId, testUserId2]);
    await pool.query('DELETE FROM users WHERE id = $1 OR id = $2', [testUserId, testUserId2]);
  });

  describe('create', () => {
    it('should create a new CV file record with all required fields', async () => {
      const data: CreateCVFileDTO = {
        userId: testUserId,
        fileName: 'cv-123.pdf',
        originalName: 'my-resume.pdf',
        s3Key: `${testUserId}/cv-123.pdf`,
        fileSize: 1024000,
        mimeType: 'application/pdf'
      };

      const cvFile = await CVFileModel.create(data);

      expect(cvFile).toBeDefined();
      expect(cvFile.id).toBeDefined();
      expect(cvFile.userId).toBe(testUserId);
      expect(cvFile.fileName).toBe(data.fileName);
      expect(cvFile.originalName).toBe(data.originalName);
      expect(cvFile.s3Key).toBe(data.s3Key);
      expect(cvFile.fileSize).toBe(data.fileSize);
      expect(cvFile.mimeType).toBe(data.mimeType);
      expect(cvFile.createdAt).toBeDefined();
      expect(cvFile.updatedAt).toBeDefined();
    });

    it('should create multiple CV files for the same user', async () => {
      const data1: CreateCVFileDTO = {
        userId: testUserId,
        fileName: 'cv-v1.pdf',
        originalName: 'resume-v1.pdf',
        s3Key: `${testUserId}/cv-v1.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      };

      const data2: CreateCVFileDTO = {
        userId: testUserId,
        fileName: 'cv-v2.pdf',
        originalName: 'resume-v2.pdf',
        s3Key: `${testUserId}/cv-v2.pdf`,
        fileSize: 600000,
        mimeType: 'application/pdf'
      };

      const cvFile1 = await CVFileModel.create(data1);
      const cvFile2 = await CVFileModel.create(data2);

      expect(cvFile1.id).not.toBe(cvFile2.id);
      expect(cvFile1.userId).toBe(testUserId);
      expect(cvFile2.userId).toBe(testUserId);
    });
  });

  describe('findById', () => {
    it('should find CV file by ID', async () => {
      const data: CreateCVFileDTO = {
        userId: testUserId,
        fileName: 'find-test.pdf',
        originalName: 'find-test-original.pdf',
        s3Key: `${testUserId}/find-test.pdf`,
        fileSize: 750000,
        mimeType: 'application/pdf'
      };

      const created = await CVFileModel.create(data);
      const found = await CVFileModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.userId).toBe(testUserId);
      expect(found?.fileName).toBe(data.fileName);
      expect(found?.originalName).toBe(data.originalName);
      expect(found?.s3Key).toBe(data.s3Key);
      expect(found?.fileSize).toBe(data.fileSize);
      expect(found?.mimeType).toBe(data.mimeType);
    });

    it('should return null for non-existent ID', async () => {
      const found = await CVFileModel.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });

    it('should handle invalid UUID format gracefully', async () => {
      // Invalid UUID format will cause a database error
      // In production, this would be caught by validation before reaching the model
      await expect(CVFileModel.findById('invalid-uuid')).rejects.toThrow();
    });
  });

  describe('findByUser', () => {
    it('should return all CV files for a user', async () => {
      // Create multiple CV files for the user
      const data1: CreateCVFileDTO = {
        userId: testUserId,
        fileName: 'user-cv-1.pdf',
        originalName: 'resume-1.pdf',
        s3Key: `${testUserId}/user-cv-1.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      };

      const data2: CreateCVFileDTO = {
        userId: testUserId,
        fileName: 'user-cv-2.pdf',
        originalName: 'resume-2.pdf',
        s3Key: `${testUserId}/user-cv-2.pdf`,
        fileSize: 600000,
        mimeType: 'application/pdf'
      };

      await CVFileModel.create(data1);
      await CVFileModel.create(data2);

      const files = await CVFileModel.findByUser(testUserId);

      expect(files.length).toBeGreaterThanOrEqual(2);
      files.forEach(file => {
        expect(file.userId).toBe(testUserId);
      });
    });

    it('should return only files for the specified user', async () => {
      // Create file for user 1
      await CVFileModel.create({
        userId: testUserId,
        fileName: 'user1-cv.pdf',
        originalName: 'user1-resume.pdf',
        s3Key: `${testUserId}/user1-cv.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      });

      // Create file for user 2
      await CVFileModel.create({
        userId: testUserId2,
        fileName: 'user2-cv.pdf',
        originalName: 'user2-resume.pdf',
        s3Key: `${testUserId2}/user2-cv.pdf`,
        fileSize: 600000,
        mimeType: 'application/pdf'
      });

      const user1Files = await CVFileModel.findByUser(testUserId);
      const user2Files = await CVFileModel.findByUser(testUserId2);

      expect(user1Files.length).toBeGreaterThan(0);
      expect(user2Files.length).toBeGreaterThan(0);

      user1Files.forEach(file => {
        expect(file.userId).toBe(testUserId);
      });

      user2Files.forEach(file => {
        expect(file.userId).toBe(testUserId2);
      });
    });

    it('should return empty array for user with no CV files', async () => {
      const newUser = await UserModel.create(`nocv-${Date.now()}@example.com`, 'password123');
      const files = await CVFileModel.findByUser(newUser.id);

      expect(files).toEqual([]);

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [newUser.id]);
    });

    it('should return files ordered by creation date (newest first)', async () => {
      // Create files with slight delay to ensure different timestamps
      const file1 = await CVFileModel.create({
        userId: testUserId,
        fileName: 'old-cv.pdf',
        originalName: 'old-resume.pdf',
        s3Key: `${testUserId}/old-cv.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      });

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));

      const file2 = await CVFileModel.create({
        userId: testUserId,
        fileName: 'new-cv.pdf',
        originalName: 'new-resume.pdf',
        s3Key: `${testUserId}/new-cv.pdf`,
        fileSize: 600000,
        mimeType: 'application/pdf'
      });

      const files = await CVFileModel.findByUser(testUserId);

      // Find our test files in the results
      const testFiles = files.filter(f => f.id === file1.id || f.id === file2.id);
      expect(testFiles.length).toBe(2);

      // Newest should come first
      const newerFileIndex = testFiles.findIndex(f => f.id === file2.id);
      const olderFileIndex = testFiles.findIndex(f => f.id === file1.id);
      expect(newerFileIndex).toBeLessThan(olderFileIndex);
    });
  });

  describe('delete', () => {
    it('should delete CV file by ID', async () => {
      const data: CreateCVFileDTO = {
        userId: testUserId,
        fileName: 'delete-test.pdf',
        originalName: 'delete-test-original.pdf',
        s3Key: `${testUserId}/delete-test.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      };

      const created = await CVFileModel.create(data);
      const deleted = await CVFileModel.delete(created.id);

      expect(deleted).toBe(true);

      // Verify it's actually deleted
      const found = await CVFileModel.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent file', async () => {
      const deleted = await CVFileModel.delete('00000000-0000-0000-0000-000000000000');
      expect(deleted).toBe(false);
    });

    it('should not affect other user files when deleting', async () => {
      const file1 = await CVFileModel.create({
        userId: testUserId,
        fileName: 'keep-this.pdf',
        originalName: 'keep-this-original.pdf',
        s3Key: `${testUserId}/keep-this.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      });

      const file2 = await CVFileModel.create({
        userId: testUserId,
        fileName: 'delete-this.pdf',
        originalName: 'delete-this-original.pdf',
        s3Key: `${testUserId}/delete-this.pdf`,
        fileSize: 600000,
        mimeType: 'application/pdf'
      });

      await CVFileModel.delete(file2.id);

      const remaining = await CVFileModel.findById(file1.id);
      expect(remaining).toBeDefined();
      expect(remaining?.id).toBe(file1.id);
    });
  });

  describe('isOwner', () => {
    it('should return true when user owns the file', async () => {
      const data: CreateCVFileDTO = {
        userId: testUserId,
        fileName: 'owner-test.pdf',
        originalName: 'owner-test-original.pdf',
        s3Key: `${testUserId}/owner-test.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      };

      const created = await CVFileModel.create(data);
      const isOwner = await CVFileModel.isOwner(created.id, testUserId);

      expect(isOwner).toBe(true);
    });

    it('should return false when user does not own the file', async () => {
      const data: CreateCVFileDTO = {
        userId: testUserId,
        fileName: 'not-owner-test.pdf',
        originalName: 'not-owner-test-original.pdf',
        s3Key: `${testUserId}/not-owner-test.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      };

      const created = await CVFileModel.create(data);
      const isOwner = await CVFileModel.isOwner(created.id, testUserId2);

      expect(isOwner).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const isOwner = await CVFileModel.isOwner('00000000-0000-0000-0000-000000000000', testUserId);
      expect(isOwner).toBe(false);
    });
  });

  describe('cascade delete on user deletion', () => {
    it('should delete CV files when user is deleted', async () => {
      // Create a temporary user
      const tempUser = await UserModel.create(`temp-${Date.now()}@example.com`, 'password123');

      // Create CV file for temp user
      const cvFile = await CVFileModel.create({
        userId: tempUser.id,
        fileName: 'temp-cv.pdf',
        originalName: 'temp-resume.pdf',
        s3Key: `${tempUser.id}/temp-cv.pdf`,
        fileSize: 500000,
        mimeType: 'application/pdf'
      });

      // Verify file exists
      const foundBefore = await CVFileModel.findById(cvFile.id);
      expect(foundBefore).toBeDefined();

      // Delete user (should cascade to cv_files)
      await pool.query('DELETE FROM users WHERE id = $1', [tempUser.id]);

      // Verify CV file is also deleted
      const foundAfter = await CVFileModel.findById(cvFile.id);
      expect(foundAfter).toBeNull();
    });
  });
});
