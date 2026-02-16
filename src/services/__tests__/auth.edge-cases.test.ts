import { AuthService } from '../auth.service';
import { UserModel } from '../../models';
import { pool } from '../../config/database';

/**
 * Unit tests for authentication edge cases
 * Requirements: 1.2, 1.4, 12.2, 12.3
 * 
 * This test suite focuses on edge cases for:
 * - Invalid credentials rejection
 * - Email format validation
 * - Password length validation
 */
describe('AuthService - Edge Cases', () => {
  // Clean up test data after each test
  afterEach(async () => {
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@edge-test.com']);
  });

  afterAll(async () => {
    // Clean up - don't close the pool as other tests may need it
  });

  describe('Invalid Credentials Rejection (Requirement 1.4)', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await UserModel.create('valid@edge-test.com', 'ValidPass123');
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@edge-test.com',
        password: 'ValidPass123',
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with incorrect password', async () => {
      const loginData = {
        email: 'valid@edge-test.com',
        password: 'WrongPassword123',
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with empty password', async () => {
      const loginData = {
        email: 'valid@edge-test.com',
        password: '',
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with password that is close but not exact', async () => {
      const loginData = {
        email: 'valid@edge-test.com',
        password: 'ValidPass124', // Off by one character
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with correct password but wrong case', async () => {
      const loginData = {
        email: 'valid@edge-test.com',
        password: 'validpass123', // Wrong case
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with email that differs only in case', async () => {
      const loginData = {
        email: 'VALID@edge-test.com', // Different case
        password: 'ValidPass123',
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Email Format Validation (Requirement 12.2)', () => {
    const validPassword = 'ValidPass123';

    it('should reject email without @ symbol', async () => {
      const registerData = {
        email: 'invalidemail.com',
        password: validPassword,
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should reject email without domain', async () => {
      const registerData = {
        email: 'user@',
        password: validPassword,
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should reject email without local part', async () => {
      const registerData = {
        email: '@domain.com',
        password: validPassword,
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should reject email without TLD', async () => {
      const registerData = {
        email: 'user@domain',
        password: validPassword,
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should reject email with spaces', async () => {
      const registerData = {
        email: 'user name@domain.com',
        password: validPassword,
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should reject email with multiple @ symbols', async () => {
      const registerData = {
        email: 'user@@domain.com',
        password: validPassword,
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should reject empty email', async () => {
      const registerData = {
        email: '',
        password: validPassword,
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should reject email with only whitespace', async () => {
      const registerData = {
        email: '   ',
        password: validPassword,
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should accept valid email with subdomain', async () => {
      const registerData = {
        email: 'user@mail.edge-test.com',
        password: validPassword,
      };

      const result = await AuthService.register(registerData);
      expect(result.user.email).toBe('user@mail.edge-test.com');
    });

    it('should accept valid email with plus sign', async () => {
      const registerData = {
        email: 'user+tag@edge-test.com',
        password: validPassword,
      };

      const result = await AuthService.register(registerData);
      expect(result.user.email).toBe('user+tag@edge-test.com');
    });

    it('should accept valid email with numbers', async () => {
      const registerData = {
        email: 'user123@edge-test.com',
        password: validPassword,
      };

      const result = await AuthService.register(registerData);
      expect(result.user.email).toBe('user123@edge-test.com');
    });

    it('should accept valid email with dots', async () => {
      const registerData = {
        email: 'first.last@edge-test.com',
        password: validPassword,
      };

      const result = await AuthService.register(registerData);
      expect(result.user.email).toBe('first.last@edge-test.com');
    });
  });

  describe('Password Length Validation (Requirement 12.3)', () => {
    const validEmail = 'user@edge-test.com';

    it('should reject password with 0 characters', async () => {
      const registerData = {
        email: validEmail,
        password: '',
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject password with 1 character', async () => {
      const registerData = {
        email: validEmail,
        password: 'a',
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject password with 7 characters', async () => {
      const registerData = {
        email: validEmail,
        password: 'Pass123',
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should accept password with exactly 8 characters', async () => {
      const registerData = {
        email: 'user1@edge-test.com',
        password: 'Pass1234',
      };

      const result = await AuthService.register(registerData);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should accept password with 9 characters', async () => {
      const registerData = {
        email: 'user2@edge-test.com',
        password: 'Pass12345',
      };

      const result = await AuthService.register(registerData);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should accept password with 20 characters', async () => {
      const registerData = {
        email: 'user3@edge-test.com',
        password: 'VeryLongPassword1234',
      };

      const result = await AuthService.register(registerData);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should accept password with special characters', async () => {
      const registerData = {
        email: 'user4@edge-test.com',
        password: 'P@ssw0rd!',
      };

      const result = await AuthService.register(registerData);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should accept password with only numbers (if 8+ chars)', async () => {
      const registerData = {
        email: 'user5@edge-test.com',
        password: '12345678',
      };

      const result = await AuthService.register(registerData);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should accept password with spaces (if 8+ chars)', async () => {
      const registerData = {
        email: 'user6@edge-test.com',
        password: 'pass word 123',
      };

      const result = await AuthService.register(registerData);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should accept password with unicode characters', async () => {
      const registerData = {
        email: 'user7@edge-test.com',
        password: 'Pässwörd123',
      };

      const result = await AuthService.register(registerData);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });
  });

  describe('Combined Edge Cases', () => {
    it('should reject registration with both invalid email and short password', async () => {
      const registerData = {
        email: 'invalid-email',
        password: 'short',
      };

      // Email validation happens first
      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should reject registration with valid email but short password', async () => {
      const registerData = {
        email: 'valid@edge-test.com',
        password: 'short',
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject duplicate email even with different password', async () => {
      const firstUser = {
        email: 'duplicate@edge-test.com',
        password: 'FirstPass123',
      };

      const secondUser = {
        email: 'duplicate@edge-test.com',
        password: 'SecondPass456',
      };

      await AuthService.register(firstUser);
      await expect(AuthService.register(secondUser)).rejects.toThrow('Email already exists');
    });
  });
});
