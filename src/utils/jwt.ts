import jwt, { Secret } from 'jsonwebtoken';
import { User } from '../types';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'default-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

/**
 * Generate a JWT token for a user
 * @param user - User object
 * @returns JWT token string
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any,
  });
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Decode a JWT token without verification (for debugging/testing)
 * @param token - JWT token string
 * @returns Decoded JWT payload or null if invalid
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
