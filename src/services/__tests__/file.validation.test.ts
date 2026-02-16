import { FileService, FileUpload } from '../file.service';

/**
 * Unit tests for file validation
 * Requirements: 2.3, 2.4
 */
describe('File Validation', () => {
  describe('File Type Validation', () => {
    it('should accept PDF files', () => {
      const file: FileUpload = {
        buffer: Buffer.from('test'),
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024
      };

      expect(() => FileService.validateFile(file)).not.toThrow();
    });

    it('should accept DOCX files', () => {
      const file: FileUpload = {
        buffer: Buffer.from('test'),
        originalName: 'test.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024
      };

      expect(() => FileService.validateFile(file)).not.toThrow();
    });

    it('should accept PNG files', () => {
      const file: FileUpload = {
        buffer: Buffer.from('test'),
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024
      };

      expect(() => FileService.validateFile(file)).not.toThrow();
    });

    it('should accept JPG files', () => {
      const file: FileUpload = {
        buffer: Buffer.from('test'),
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024
      };

      expect(() => FileService.validateFile(file)).not.toThrow();
    });

    it('should reject text files', () => {
      const file: FileUpload = {
        buffer: Buffer.from('test'),
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 1024
      };

      expect(() => FileService.validateFile(file)).toThrow('Invalid file type. Allowed types: PDF, DOCX, PNG, JPG');
    });

    it('should reject GIF files', () => {
      const file: FileUpload = {
        buffer: Buffer.from('test'),
        originalName: 'test.gif',
        mimeType: 'image/gif',
        size: 1024
      };

      expect(() => FileService.validateFile(file)).toThrow('Invalid file type. Allowed types: PDF, DOCX, PNG, JPG');
    });

    it('should reject ZIP files', () => {
      const file: FileUpload = {
        buffer: Buffer.from('test'),
        originalName: 'test.zip',
        mimeType: 'application/zip',
        size: 1024
      };

      expect(() => FileService.validateFile(file)).toThrow('Invalid file type. Allowed types: PDF, DOCX, PNG, JPG');
    });
  });

  describe('File Size Validation', () => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    it('should accept files smaller than 10MB', () => {
      const file: FileUpload = {
        buffer: Buffer.alloc(1024),
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024
      };

      expect(() => FileService.validateFile(file)).not.toThrow();
    });

    it('should accept files exactly at 10MB', () => {
      const file: FileUpload = {
        buffer: Buffer.alloc(MAX_SIZE),
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: MAX_SIZE
      };

      expect(() => FileService.validateFile(file)).not.toThrow();
    });

    it('should reject files larger than 10MB', () => {
      const file: FileUpload = {
        buffer: Buffer.alloc(MAX_SIZE + 1),
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: MAX_SIZE + 1
      };

      expect(() => FileService.validateFile(file)).toThrow('File size exceeds maximum allowed size');
    });

    it('should reject files significantly larger than 10MB', () => {
      const file: FileUpload = {
        buffer: Buffer.alloc(20 * 1024 * 1024),
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 20 * 1024 * 1024
      };

      expect(() => FileService.validateFile(file)).toThrow('File size exceeds maximum allowed size');
    });

    it('should include file size in error message', () => {
      const fileSize = 15 * 1024 * 1024; // 15MB
      const file: FileUpload = {
        buffer: Buffer.alloc(fileSize),
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: fileSize
      };

      expect(() => FileService.validateFile(file)).toThrow(/File size: 15\.00MB/);
    });
  });

  describe('Combined Validation', () => {
    it('should reject files with invalid type even if size is valid', () => {
      const file: FileUpload = {
        buffer: Buffer.from('test'),
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 1024
      };

      expect(() => FileService.validateFile(file)).toThrow('Invalid file type');
    });

    it('should reject files with invalid size even if type is valid', () => {
      const file: FileUpload = {
        buffer: Buffer.alloc(11 * 1024 * 1024),
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 11 * 1024 * 1024
      };

      expect(() => FileService.validateFile(file)).toThrow('File size exceeds maximum allowed size');
    });

    it('should accept files with both valid type and size', () => {
      const file: FileUpload = {
        buffer: Buffer.alloc(5 * 1024 * 1024),
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 5 * 1024 * 1024
      };

      expect(() => FileService.validateFile(file)).not.toThrow();
    });
  });
});
