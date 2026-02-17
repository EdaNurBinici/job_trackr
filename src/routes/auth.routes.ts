import { Router, Request, Response } from 'express';
import { AuthService } from '../services';
import { RegisterDTO, LoginDTO } from '../types';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 * Requirements: 1.1
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data: RegisterDTO = req.body;

    // Validate required fields
    if (!data.email || !data.password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          details: {
            email: !data.email ? 'Email is required' : undefined,
            password: !data.password ? 'Password is required' : undefined,
          },
        },
      });
    }

    const result = await AuthService.register(data);

    return res.status(201).json({
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific validation errors
      if (error.message === 'Invalid email format') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: {
              email: error.message,
            },
          },
        });
      }

      if (error.message === 'Password must be at least 8 characters') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: {
              password: error.message,
            },
          },
        });
      }

      if (error.message === 'Email already exists') {
        return res.status(400).json({
          error: {
            code: 'DUPLICATE_EMAIL',
            message: error.message,
          },
        });
      }
    }

    // Generic server error
    console.error('Registration error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/auth/login
 * Login a user
 * Requirements: 1.3
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data: LoginDTO = req.body;

    // Validate required fields
    if (!data.email || !data.password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          details: {
            email: !data.email ? 'Email is required' : undefined,
            password: !data.password ? 'Password is required' : undefined,
          },
        },
      });
    }

    const result = await AuthService.login(data);

    return res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle invalid credentials
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        });
      }
    }

    // Generic server error
    console.error('Login error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required',
        },
      });
    }

    // Kullanıcıyı bul
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      // Güvenlik için email bulunamasa bile başarılı mesaj göster
      return res.status(200).json({
        data: {
          message: 'If the email exists, a reset link has been sent',
        },
      });
    }

    const user = result.rows[0];

    // Reset token oluştur (6 haneli random sayı)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 3600000); // 1 saat

    // Token'ı database'e kaydet
    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // Email gönder
    const { emailService } = await import('../services');
    await emailService.sendPasswordResetEmail(email, resetToken);

    return res.status(200).json({
      data: {
        message: 'If the email exists, a reset link has been sent',
      },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, token, and new password are required',
        },
      });
    }

    // Token'ı kontrol et
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND reset_password_token = $2 AND reset_password_expires > NOW()',
      [email, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
        },
      });
    }

    const user = result.rows[0];

    // Yeni şifreyi hashle
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Şifreyi güncelle ve token'ı temizle
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    return res.status(200).json({
      data: {
        message: 'Password reset successful',
      },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

export default router;


/**
 * Google OAuth Routes
 */
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from '../config/database';
import jwt from 'jsonwebtoken';

// Google Strategy Configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Google'dan gelen kullanıcı bilgileri
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('No email from Google'), undefined);
        }

        // Database'de Google ID ile kullanıcı var mı kontrol et
        let result = await pool.query(
          'SELECT * FROM users WHERE google_id = $1',
          [googleId]
        );

        let user;

        if (result.rows.length === 0) {
          // Email ile kullanıcı var mı kontrol et
          result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
          );

          if (result.rows.length > 0) {
            // Mevcut kullanıcıya Google ID ekle
            console.log('Adding Google ID to existing user:', email);
            result = await pool.query(
              `UPDATE users 
               SET google_id = $1, email_verified = true 
               WHERE email = $2 
               RETURNING id, email, role, created_at AS "createdAt"`,
              [googleId, email]
            );
            user = result.rows[0];
          } else {
            // Yeni kullanıcı oluştur
            console.log('Creating new user from Google:', email);
            result = await pool.query(
              `INSERT INTO users (email, google_id, email_verified, role, password_hash) 
               VALUES ($1, $2, true, 'user', 'google-oauth') 
               RETURNING id, email, role, created_at AS "createdAt"`,
              [email, googleId]
            );
            user = result.rows[0];
          }
        } else {
          // Mevcut kullanıcı (Google ID ile)
          user = result.rows[0];
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Google OAuth başlat
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req: any, res: Response) => {
    try {
      const user = req.user;

      // JWT token oluştur
      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Frontend'e token ile yönlendir
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);
