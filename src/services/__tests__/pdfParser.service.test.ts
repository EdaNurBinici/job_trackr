/**
 * PDF Parser Service Unit Tests
 * Tests for PDF text extraction functionality
 * Requirements: 4.2, 4.3, 4.4
 */

import { PDFParserService } from '../pdfParser.service';

describe('PDFParserService', () => {
  describe('extractTextFromPDF', () => {
    it('should extract text from a valid PDF with sufficient content', async () => {
      // Create a more complete PDF with actual text content
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
100 700 Td
(This is a test PDF document with sufficient text content for parsing.) Tj
0 -20 Td
(It contains multiple lines to ensure proper text extraction.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000350 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
600
%%EOF`;
      
      const validPdfBuffer = Buffer.from(pdfContent);
      const result = await PDFParserService.extractTextFromPDF(validPdfBuffer);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(50);
    });

    it('should clean and normalize extracted text', async () => {
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 180 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test    Multiple    Spaces    And    Whitespace    Normalization) Tj
0 -20 Td
(This ensures proper text cleaning and formatting works correctly) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000350 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
600
%%EOF`;

      const validPdfBuffer = Buffer.from(pdfContent);
      const result = await PDFParserService.extractTextFromPDF(validPdfBuffer);
      
      // Should normalize multiple spaces to single space
      expect(result).not.toContain('    ');
      expect(result.trim()).toBe(result); // Should be trimmed
      expect(result.length).toBeGreaterThan(50);
    });

    it('should throw error for invalid PDF buffer', async () => {
      const invalidBuffer = Buffer.from('This is not a PDF file');

      await expect(
        PDFParserService.extractTextFromPDF(invalidBuffer)
      ).rejects.toThrow();
    });

    it('should throw error for empty buffer', async () => {
      const emptyBuffer = Buffer.from('');

      await expect(
        PDFParserService.extractTextFromPDF(emptyBuffer)
      ).rejects.toThrow();
    });

    it('should throw error for corrupted PDF', async () => {
      // PDF signature but corrupted content
      const corruptedBuffer = Buffer.from('%PDF-1.4\nCorrupted content');

      await expect(
        PDFParserService.extractTextFromPDF(corruptedBuffer)
      ).rejects.toThrow();
    });

    it('should throw user-friendly error for empty PDF', async () => {
      // Valid PDF structure but no text content
      const emptyPdfBuffer = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n200\n%%EOF'
      );

      await expect(
        PDFParserService.extractTextFromPDF(emptyPdfBuffer)
      ).rejects.toThrow(/boş görünüyor|metin içermiyor/i);
    });

    it('should handle PDF parsing errors gracefully', async () => {
      const malformedBuffer = Buffer.from('%PDF-1.4\nMalformed');

      await expect(
        PDFParserService.extractTextFromPDF(malformedBuffer)
      ).rejects.toThrow(/okunamadı|bozuk/i);
    });
  });

  describe('validatePDF', () => {
    it('should validate a buffer with correct PDF signature', () => {
      const validBuffer = Buffer.from('%PDF-1.4\nSome content');

      expect(() => {
        PDFParserService.validatePDF(validBuffer);
      }).not.toThrow();
    });

    it('should throw error for buffer without PDF signature', () => {
      const invalidBuffer = Buffer.from('Not a PDF');

      expect(() => {
        PDFParserService.validatePDF(invalidBuffer);
      }).toThrow('File is not a valid PDF');
    });

    it('should throw error for empty buffer', () => {
      const emptyBuffer = Buffer.from('');

      expect(() => {
        PDFParserService.validatePDF(emptyBuffer);
      }).toThrow('File is not a valid PDF');
    });

    it('should throw error for buffer shorter than 4 bytes', () => {
      const shortBuffer = Buffer.from('PDF');

      expect(() => {
        PDFParserService.validatePDF(shortBuffer);
      }).toThrow('File is not a valid PDF');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large text extraction', async () => {
      // Create a PDF with substantial content
      const largeText = 'This is a large document with substantial content. '.repeat(20);
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${largeText.length + 50} >>
stream
BT
/F1 12 Tf
100 700 Td
(${largeText}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000350 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
600
%%EOF`;

      const largePdfBuffer = Buffer.from(pdfContent);
      const result = await PDFParserService.extractTextFromPDF(largePdfBuffer);
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(50);
    });

    it('should handle special characters in PDF text', async () => {
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 150 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Special Characters: Email test@example.com Phone 555-1234) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000350 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
600
%%EOF`;

      const specialCharsPdf = Buffer.from(pdfContent);
      const result = await PDFParserService.extractTextFromPDF(specialCharsPdf);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(50);
    });
  });

  describe('Performance', () => {
    it('should extract text within reasonable time', async () => {
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 150 >>
stream
BT
/F1 12 Tf
100 700 Td
(Performance Test PDF with sufficient content for timing validation) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000350 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
600
%%EOF`;

      const validPdfBuffer = Buffer.from(pdfContent);
      const startTime = Date.now();
      await PDFParserService.extractTextFromPDF(validPdfBuffer);
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      
      // Should complete within 5 seconds for a simple PDF
      expect(executionTime).toBeLessThan(5000);
    });
  });
});
