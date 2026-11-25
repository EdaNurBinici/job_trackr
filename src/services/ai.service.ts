import Groq from 'groq-sdk';
const isGroqConfigured = !!process.env.GROQ_API_KEY;
const groq = isGroqConfigured
  ? new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;
export interface CVAnalysisResult {
  match_score: number;
  missing_skills: string[];
  recommendations: string[];
}
export class AIService {
  static isConfigured(): boolean {
    return isGroqConfigured;
  }
  static async analyzeCVMatch(
    cvText: string,
    jobDescription: string,
    language: 'tr' | 'en' = 'tr'
  ): Promise<CVAnalysisResult> {
    if (!isGroqConfigured || !groq) {
      throw new Error('Groq API is not configured. Please set GROQ_API_KEY in .env');
    }
    try {
      const prompt = this.buildAnalysisPrompt(cvText, jobDescription, language);
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              language === 'en'
                ? 'You are an expert HR consultant and career coach. You analyze CVs and job postings and give accurate match scores and actionable recommendations. ALWAYS answer in English.'
                : 'Sen uzman bir İK danışmanı ve kariyer koçusun. CV\'leri ve iş ilanlarını analiz ederek doğru eşleşme skorları ve uygulanabilir öneriler sunuyorsun. HER ZAMAN TÜRKÇE cevap ver.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'openai/gpt-oss-120b',
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }
      const result = JSON.parse(responseText) as CVAnalysisResult;
      this.validateAnalysisResult(result);
      return result;
    } catch (error) {
      console.error('AI analysis error:', error);
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid Groq API key');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('AI service rate limit exceeded. Please try again later.');
        }
      }
      throw new Error('Failed to analyze CV. Please try again.');
    }
  }
  private static buildAnalysisPrompt(cvText: string, jobDescription: string, language: 'tr' | 'en'): string {
    if (language === 'en') {
      return `Compare the CV below with the job posting and produce a detailed match analysis. Answer in English, even if the CV or the posting is written in another language.
CV:
${cvText}
Job posting:
${jobDescription}
Reply with JSON in exactly this structure:
{
  "match_score": <integer 0-100>,
  "missing_skills": [<important skills named in the posting but absent from the CV - in English>],
  "recommendations": [<3-5 specific, actionable suggestions to improve the CV for this role - in English>]
}
Rules:
- match_score: base it on skill match, experience fit and overall suitability (0-100)
- missing_skills: list only skills/technologies explicitly required by the posting and missing from the CV
- recommendations: 3-5 specific, actionable suggestions
Be objective and constructive. ALL TEXT MUST BE IN ENGLISH.`;
    }
    return `Aşağıdaki CV'yi iş ilanıyla karşılaştır ve detaylı bir eşleşme analizi yap. TÜRKÇE cevap ver.
CV:
${cvText}
İş İlanı:
${jobDescription}
Aşağıdaki yapıda JSON cevabı ver:
{
  "match_score": <0-100 arası tam sayı>,
  "missing_skills": [<iş ilanında geçen ama CV'de bulunmayan önemli beceriler - TÜRKÇE>],
  "recommendations": [<CV'yi bu pozisyon için geliştirmeye yönelik 3-5 spesifik öneri - TÜRKÇE>]
}
Kurallar:
- match_score: Beceri eşleşmesi, deneyim uyumu ve genel uygunluğa göre hesapla (0-100)
- missing_skills: Sadece iş ilanında açıkça belirtilen ama CV'de olmayan önemli beceri/teknolojileri listele
- recommendations: CV'yi bu rol için geliştirmeye yönelik 3-5 spesifik, uygulanabilir öneri ver
Nesnel ve yapıcı ol. Teknik beceriler, deneyim ve niteliklere odaklan. TÜM CEVAPLAR TÜRKÇE OLMALI.`;
  }
  private static validateAnalysisResult(result: any): void {
    if (typeof result.match_score !== 'number') {
      throw new Error('Invalid AI response: match_score must be a number');
    }
    if (result.match_score < 0 || result.match_score > 100) {
      throw new Error('Invalid AI response: match_score must be between 0 and 100');
    }
    if (!Array.isArray(result.missing_skills)) {
      throw new Error('Invalid AI response: missing_skills must be an array');
    }
    if (!Array.isArray(result.recommendations)) {
      throw new Error('Invalid AI response: recommendations must be an array');
    }
  }
  static async chat(prompt: string): Promise<string> {
    if (!isGroqConfigured || !groq) {
      throw new Error('Groq API is not configured. Please set GROQ_API_KEY in .env');
    }
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'openai/gpt-oss-120b',
        temperature: 0.7,
        max_tokens: 2000,
      });
      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }
      return responseText;
    } catch (error) {
      console.error('AI chat error:', error);
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid Groq API key');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('AI service rate limit exceeded. Please try again later.');
        }
      }
      throw new Error('Failed to generate response. Please try again.');
    }
  }
}
