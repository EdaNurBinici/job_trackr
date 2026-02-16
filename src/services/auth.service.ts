import { UserModel } from '../models';
import { generateToken } from '../utils';
import { LoginResponse, RegisterDTO, LoginDTO } from '../types';

export class AuthService {
  /**
   * Register a new user
   * @param data - Registration data (email, password)
   * @returns Created user and JWT token
   * @throws Error if email already exists or validation fails
   */
  static async register(data: RegisterDTO): Promise<LoginResponse> {
    const { email, password } = data;

    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password length
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if email already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Create user
    const user = await UserModel.create(email, password);

    // Generate JWT token
    const token = generateToken(user);

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Login a user
   * @param data - Login data (email, password)
   * @returns User and JWT token
   * @throws Error if credentials are invalid
   */
  static async login(data: LoginDTO): Promise<LoginResponse> {
    const { email, password } = data;

    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await UserModel.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Validate email format
   * @param email - Email to validate
   * @returns True if email is valid
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
