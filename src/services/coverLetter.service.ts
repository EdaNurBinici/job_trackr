/**
 * Cover Letter Service
 * AI-powered cover letter generation
 * Requirements: 13.1-13.4, 14.1-14.3
 */

import { AIService } from './ai.service';
import { CVFileModel } from '../models/cvFile.model';
import { PDFParserService } from './pdfParser.service';
import { S3Service } from './s3.service';
import { CoverLetterModel, CreateCoverLetterDTO, CoverLetter } from '../models/coverLetter.model';

export interface GenerateCoverLetterParams {
  userId: string;
  cvFileId: string;
  applicationId?: string;
  companyName: string;
  position: string;
  jobDescription: string;
  tone: 'formal' | 'casual' | 'creative';
  language: 'tr' | 'en';
}

export class CoverLetterService {
  /**
   * Generate cover letter using AI
   * Requirements: 13.1-13.4
   */
  static async generateCoverLetter(params: GenerateCoverLetterParams): Promise<CoverLetter> {
    const {
      userId,
      cvFileId,
      applicationId,
      companyName,
      position,
      jobDescription,
      tone,
      language,
    } = params;

    // Check if AI service is configured
    if (!AIService.isConfigured()) {
      throw new Error('AI service is not configured. Please set GROQ_API_KEY in environment variables.');
    }

    // Get CV file
    const cvFile = await CVFileModel.findById(cvFileId);
    if (!cvFile) {
      throw new Error('CV file not found');
    }

    // Check ownership
    if (cvFile.userId !== userId) {
      throw new Error('Unauthorized access to CV file');
    }

    // Check if file is PDF
    if (cvFile.mimeType !== 'application/pdf') {
      throw new Error('Only PDF files are supported');
    }

    // Read CV file (S3 or local storage)
    const fileBuffer = await S3Service.getFileBuffer(cvFile.s3Key);

    // Extract text from PDF
    const cvText = await PDFParserService.extractTextFromPDF(fileBuffer);

    // Generate cover letter with AI
    const coverLetterContent = await this.generateWithAI(
      cvText,
      jobDescription,
      companyName,
      position,
      tone,
      language
    );

    // Save to database
    const coverLetterData: CreateCoverLetterDTO = {
      userId,
      cvFileId,
      applicationId,
      companyName,
      position,
      tone,
      language,
      content: coverLetterContent,
    };

    const coverLetter = await CoverLetterModel.create(coverLetterData);

    return coverLetter;
  }

  /**
   * Generate cover letter content using AI
   */
  private static async generateWithAI(
    cvText: string,
    jobDescription: string,
    companyName: string,
    position: string,
    tone: 'formal' | 'casual' | 'creative',
    language: 'tr' | 'en'
  ): Promise<string> {
    const prompt = this.buildPrompt(cvText, jobDescription, companyName, position, tone, language);

    const response = await AIService.chat(prompt);

    return response.trim();
  }

  /**
   * Build AI prompt based on tone and language
   */
  private static buildPrompt(
    cvText: string,
    jobDescription: string,
    companyName: string,
    position: string,
    tone: 'formal' | 'casual' | 'creative',
    language: 'tr' | 'en'
  ): string {
    const prompts = {
      formal: {
        tr: `Sen profesyonel bir kariyer danışmanısın. Aşağıdaki CV ve iş ilanına göre, resmi ve profesyonel bir ön yazı (cover letter) oluştur.

ÖNEMLİ KURALLAR:
- Ön yazı 3-4 paragraf olmalı
- Resmi ve profesyonel dil kullan
- Şirketin değerlerine ve pozisyonun gereksinimlerine uygun ol
- Adayın güçlü yönlerini vurgula
- Somut örnekler ver
- Standart başlık ve kapanış kullan
- Maksimum 400 kelime

ŞİRKET: ${companyName}
POZİSYON: ${position}

İŞ İLANI:
${jobDescription}

ADAY CV'Sİ:
${cvText}

Lütfen sadece ön yazı metnini yaz, başka açıklama ekleme.`,
        en: `You are a professional career advisor. Based on the CV and job posting below, create a formal and professional cover letter.

IMPORTANT RULES:
- Cover letter should be 3-4 paragraphs
- Use formal and professional language
- Align with company values and position requirements
- Highlight candidate's strengths
- Provide concrete examples
- Use standard opening and closing
- Maximum 400 words

COMPANY: ${companyName}
POSITION: ${position}

JOB POSTING:
${jobDescription}

CANDIDATE CV:
${cvText}

Please write only the cover letter text, no additional explanations.`,
      },
      casual: {
        tr: `Sen samimi ve yaklaşılabilir bir kariyer danışmanısın. Aşağıdaki CV ve iş ilanına göre, sıcak ve samimi ama profesyonel bir ön yazı oluştur.

ÖNEMLİ KURALLAR:
- Ön yazı 3-4 paragraf olmalı
- Samimi ama profesyonel dil kullan
- Kişisel hikaye ve motivasyon ekle
- Şirket kültürüne uygun ol
- Aşırı resmi olmaktan kaçın
- Doğal ve içten ol
- Maksimum 400 kelime

ŞİRKET: ${companyName}
POZİSYON: ${position}

İŞ İLANI:
${jobDescription}

ADAY CV'Sİ:
${cvText}

Lütfen sadece ön yazı metnini yaz, başka açıklama ekleme.`,
        en: `You are a friendly and approachable career advisor. Based on the CV and job posting below, create a warm and friendly but professional cover letter.

IMPORTANT RULES:
- Cover letter should be 3-4 paragraphs
- Use friendly but professional language
- Include personal story and motivation
- Align with company culture
- Avoid being overly formal
- Be natural and genuine
- Maximum 400 words

COMPANY: ${companyName}
POSITION: ${position}

JOB POSTING:
${jobDescription}

CANDIDATE CV:
${cvText}

Please write only the cover letter text, no additional explanations.`,
      },
      creative: {
        tr: `Sen yaratıcı bir içerik yazarısın. Aşağıdaki CV ve iş ilanına göre, dikkat çekici ve özgün bir ön yazı oluştur.

ÖNEMLİ KURALLAR:
- Ön yazı 3-4 paragraf olmalı
- Yaratıcı ve özgün dil kullan
- Standart kalıplardan kaçın
- Hikaye anlatımı kullan
- Adayın benzersiz yönlerini vurgula
- Şirketin dikkatini çek
- Profesyonellikten ödün verme
- Maksimum 400 kelime

ŞİRKET: ${companyName}
POZİSYON: ${position}

İŞ İLANI:
${jobDescription}

ADAY CV'Sİ:
${cvText}

Lütfen sadece ön yazı metnini yaz, başka açıklama ekleme.`,
        en: `You are a creative content writer. Based on the CV and job posting below, create an attention-grabbing and unique cover letter.

IMPORTANT RULES:
- Cover letter should be 3-4 paragraphs
- Use creative and unique language
- Avoid standard templates
- Use storytelling
- Highlight candidate's unique qualities
- Grab company's attention
- Maintain professionalism
- Maximum 400 words

COMPANY: ${companyName}
POSITION: ${position}

JOB POSTING:
${jobDescription}

CANDIDATE CV:
${cvText}

Please write only the cover letter text, no additional explanations.`,
      },
    };

    return prompts[tone][language];
  }

  /**
   * Get cover letter by ID
   */
  static async getCoverLetter(id: string, userId: string): Promise<CoverLetter> {
    const coverLetter = await CoverLetterModel.findById(id);

    if (!coverLetter) {
      throw new Error('Cover letter not found');
    }

    // Check ownership
    if (coverLetter.userId !== userId) {
      throw new Error('Unauthorized access to cover letter');
    }

    return coverLetter;
  }

  /**
   * List user's cover letters
   */
  static async listUserCoverLetters(userId: string, limit: number = 50): Promise<CoverLetter[]> {
    return CoverLetterModel.findByUser(userId, limit);
  }

  /**
   * Update cover letter
   */
  static async updateCoverLetter(
    id: string,
    userId: string,
    content: string
  ): Promise<CoverLetter> {
    const coverLetter = await CoverLetterModel.findById(id);

    if (!coverLetter) {
      throw new Error('Cover letter not found');
    }

    // Check ownership
    if (coverLetter.userId !== userId) {
      throw new Error('Unauthorized access to cover letter');
    }

    const updated = await CoverLetterModel.update(id, { content });

    if (!updated) {
      throw new Error('Failed to update cover letter');
    }

    return updated;
  }

  /**
   * Delete cover letter
   */
  static async deleteCoverLetter(id: string, userId: string): Promise<void> {
    const coverLetter = await CoverLetterModel.findById(id);

    if (!coverLetter) {
      throw new Error('Cover letter not found');
    }

    // Check ownership
    if (coverLetter.userId !== userId) {
      throw new Error('Unauthorized access to cover letter');
    }

    await CoverLetterModel.delete(id);
  }

}
