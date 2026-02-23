import { UserModel } from '../models';
import { generateToken } from '../utils';
import { LoginResponse, RegisterDTO, LoginDTO } from '../types';
export class AuthService {
  static async register(data: RegisterDTO): Promise<LoginResponse> {
    const { email, password } = data;
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already exists');
    }
    const user = await UserModel.create(email, password);
    const token = generateToken(user);
    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token,
    };
  }
  static async login(data: LoginDTO): Promise<LoginResponse> {
    const { email, password } = data;
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const isPasswordValid = await UserModel.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    const token = generateToken(user);
    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token,
    };
  }
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
