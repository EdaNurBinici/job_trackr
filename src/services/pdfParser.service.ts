/**
 * PDF Parser Service
 * Extracts text from PDF files
 * Requirements: 4.1-4.4
 */

export class PDFParserService {
  /**
   * Extract text from PDF buffer
   * Requirements: 4.2, 4.3
   */
  static async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import for pdf-parse
      const pdfParse = await import('pdf-parse');
      const parseFunction = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
      
      const data = await parseFunction(buffer);
      
      // Extract and clean text
      let text = data.text;
      
      // Normalize whitespace
      text = text.replace(/\s+/g, ' ').trim();
      
      // Remove excessive line breaks
      text = text.replace(/\n{3,}/g, '\n\n');
      
      if (!text || text.length < 50) {
        throw new Error('PDF appears to be empty or contains insufficient text');
      }
      
      return text;
    } catch (error) {
      console.error('PDF parsing error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid PDF') || error.message.includes('bad XRef')) {
          throw new Error('PDF dosyası bozuk veya okunamıyor. Lütfen farklı bir PDF deneyin.');
        }
        if (error.message.includes('encrypted')) {
          throw new Error('PDF şifre korumalı. Lütfen şifresiz bir PDF yükleyin.');
        }
        if (error.message.includes('empty') || error.message.includes('insufficient')) {
          throw new Error('PDF boş görünüyor veya metin içermiyor. Lütfen metin içeren bir PDF yükleyin.');
        }
      }
      
      throw new Error('PDF okunamadı. Lütfen farklı bir PDF deneyin veya PDF\'i yeniden kaydedin.');
    }
  }

  /**
   * Validate PDF buffer
   */
  static validatePDF(buffer: Buffer): void {
    // Check if buffer starts with PDF signature
    const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    
    if (buffer.length < 4 || !buffer.subarray(0, 4).equals(pdfSignature)) {
      throw new Error('File is not a valid PDF');
    }
  }
}
