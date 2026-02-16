import { AuthService } from '../auth.service';
import { UserModel } from '../../models';
import { verifyToken } from '../../utils';
import { pool } from '../../config/database';

describe('AuthService', () => {
  // Clean up test data after each test
  afterEach(async () => {
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
  });

  afterAll(async () => {
    // Clean up - don't close the pool as other tests may need it
  });

  describe('register', () => {
    it('should register a new user and return JWT token', async () => {
      const registerData = {
        email: 'test1@example.com',
        password: 'password123',
      };

      const result = await AuthService.register(registerData);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(registerData.email);
      expect(result.user.role).toBe('user');
      expect(result.user).not.toHaveProperty('passwordHash');

      // Verify token is valid
      const payload = verifyToken(result.token);
      expect(payload.userId).toBe(result.user.id);
      expect(payload.email).toBe(result.user.email);
      expect(payload.role).toBe(result.user.role);
    });

    it('should reject registration with invalid email format', async () => {
      const registerData = {
        email: 'invalid-email',
        password: 'password123',
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    it('should reject registration with short password', async () => {
      const registerData = {
        email: 'test2@example.com',
        password: 'short',
      };

      await expect(AuthService.register(registerData)).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject registration with duplicate email', async () => {
      const registerData = {
        email: 'test3@example.com',
        password: 'password123',
      };

      // Register first time
      await AuthService.register(registerData);

      // Try to register again with same email
      await expect(AuthService.register(registerData)).rejects.toThrow('Email already exists');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user
      await UserModel.create('test4@example.com', 'password123');
    });

    it('should login with valid credentials and return JWT token', async () => {
      const loginData = {
        email: 'test4@example.com',
        password: 'password123',
      };

      const result = await AuthService.login(loginData);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(loginData.email);
      expect(result.user).not.toHaveProperty('passwordHash');

      // Verify token is valid
      const payload = verifyToken(result.token);
      expect(payload.userId).toBe(result.user.id);
      expect(payload.email).toBe(result.user.email);
      expect(payload.role).toBe(result.user.role);
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with incorrect password', async () => {
      const loginData = {
        email: 'test4@example.com',
        password: 'wrongpassword',
      };

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('JWT token integration', () => {
    it('should generate valid JWT token that can be verified', async () => {
      const registerData = {
        email: 'test5@example.com',
        password: 'password123',
      };

      const { token, user } = await AuthService.register(registerData);

      // Verify the token
      const payload = verifyToken(token);

      expect(payload.userId).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.role).toBe(user.role);
    });

    it('should generate different tokens for different users', async () => {
      const user1Data = {
        email: 'test6@example.com',
        password: 'password123',
      };

      const user2Data = {
        email: 'test7@example.com',
        password: 'password123',
      };

      const result1 = await AuthService.register(user1Data);
      const result2 = await AuthService.register(user2Data);

      expect(result1.token).not.toBe(result2.token);

      const payload1 = verifyToken(result1.token);
      const payload2 = verifyToken(result2.token);

      expect(payload1.userId).not.toBe(payload2.userId);
      expect(payload1.email).not.toBe(payload2.email);
    });

    it('should generate token with 24 hour expiration', async () => {
      const registerData = {
        email: 'test8@example.com',
        password: 'password123',
      };

      const { token } = await AuthService.register(registerData);

      const payload = verifyToken(token) as any;

      // Check that token has expiration
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();

      // Check that expiration is approximately 24 hours from now
      const expirationTime = payload.exp - payload.iat;
      const expectedExpiration = 24 * 60 * 60; // 24 hours in seconds

      expect(expirationTime).toBe(expectedExpiration);
    });
  });
});
