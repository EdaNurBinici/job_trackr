import { Resend } from 'resend';
export class EmailService {
  private resend: Resend | null = null;
  constructor() {
    this.initializeResend();
  }
  private initializeResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        this.resend = new Resend(apiKey);
        console.log('✓ Email service initialized (Resend)');
      } catch (error) {
        console.error('✗ Email initialization failed:', error);
      }
    } else {
      console.log('⚠ Email not configured (RESEND_API_KEY missing)');
    }
  }
  async sendReminderEmail(email: string, companyName: string, position: string, reminderDate: Date): Promise<boolean> {
    if (!this.resend) return false;
    try {
      await this.resend.emails.send({
        from: 'JobTrackr <onboarding@resend.dev>',
        to: email,
        subject: `🔔 Hatırlatma: Yarın ${companyName} Başvurunuzu Takip Edin!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                          width: 64px; height: 64px; border-radius: 16px; margin-bottom: 20px;">
                <span style="color: white; font-size: 32px; line-height: 64px;">🔔</span>
              </div>
              <h1 style="color: #1f2937; margin: 0;">Başvuru Hatırlatması</h1>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              Merhaba,
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              <strong>${companyName}</strong> şirketine yaptığınız <strong>${position}</strong> 
              başvurunuz için hatırlatma zamanı geldi!
            </p>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <p style="margin: 0 0 10px 0; color: #92400e; font-size: 18px; font-weight: bold;">
                ⏰ Yarın takip etmeyi unutmayın!
              </p>
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Hatırlatma Tarihi:</strong> ${reminderDate.toLocaleDateString('tr-TR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              Başvurunuzu takip etmek için şirketle iletişime geçebilir veya başvuru durumunuzu kontrol edebilirsiniz. 
              İyi şanslar! 🍀
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/applications" 
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                        color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; 
                        font-weight: 600;">
                Başvurularımı Görüntüle
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Bu email JobTrackr tarafından otomatik olarak gönderilmiştir.<br>
              Hatırlatmalar her gün saat 18:00'da kontrol edilir.<br>
              © 2026 JobTrackr. Tüm hakları saklıdır.
            </p>
          </div>
        `,
      });
      console.log('✓ Reminder email sent to:', email);
      return true;
    } catch (error) {
      console.error('✗ Reminder email failed:', error);
      return false;
    }
  }
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    if (!this.resend) return false;
    try {
      await this.resend.emails.send({
        from: 'JobTrackr <onboarding@resend.dev>',
        to: email,
        subject: 'JobTrackr - Şifre Sıfırlama',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                          width: 64px; height: 64px; border-radius: 16px; margin-bottom: 20px;">
                <span style="color: white; font-size: 32px; font-weight: bold; line-height: 64px;">JT</span>
              </div>
              <h1 style="color: #1f2937; margin: 0;">Şifre Sıfırlama</h1>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              Merhaba,
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              JobTrackr hesabınız için şifre sıfırlama talebinde bulundunuz. 
              Aşağıdaki kodu kullanarak şifrenizi sıfırlayabilirsiniz:
            </p>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">
                ${resetToken}
              </div>
            </div>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
              Bu kod 1 saat geçerlidir. Eğer şifre sıfırlama talebinde bulunmadıysanız, 
              bu email'i görmezden gelebilirsiniz.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Bu email JobTrackr tarafından otomatik olarak gönderilmiştir.
            </p>
          </div>
        `,
      });
      console.log('✓ Password reset email sent to:', email);
      return true;
    } catch (error) {
      console.error('✗ Password reset email failed:', error);
      return false;
    }
  }
  async sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    if (!this.resend) return false;
    try {
      await this.resend.emails.send({
        from: 'JobTrackr <onboarding@resend.dev>',
        to: email,
        subject: 'JobTrackr - Email Doğrulama',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                          width: 64px; height: 64px; border-radius: 16px; margin-bottom: 20px;">
                <span style="color: white; font-size: 32px; font-weight: bold; line-height: 64px;">JT</span>
              </div>
              <h1 style="color: #1f2937; margin: 0;">Email Doğrulama</h1>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              Merhaba,
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              JobTrackr'a hoş geldiniz! Email adresinizi doğrulamak için aşağıdaki kodu kullanın:
            </p>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">
                ${verificationToken}
              </div>
            </div>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
              Bu kod 24 saat geçerlidir.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Bu email JobTrackr tarafından otomatik olarak gönderilmiştir.
            </p>
          </div>
        `,
      });
      console.log('✓ Verification email sent to:', email);
      return true;
    } catch (error) {
      console.error('✗ Verification email failed:', error);
      return false;
    }
  }
}
export const emailService = new EmailService();
