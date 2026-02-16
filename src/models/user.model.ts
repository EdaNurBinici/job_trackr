import { pool } from '../config/database';
import { User } from '../types';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export class UserModel {
  /**
   * Hash a plain text password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Create a new user
   */
  static async create(email: string, password: string, role: 'user' | 'admin' = 'user'): Promise<User> {
    const passwordHash = await this.hashPassword(password);
    
    const query = `
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    
    try {
      const result = await pool.query(query, [email, passwordHash, role]);
      return result.rows[0];
    } catch (error: any) {
      // Handle unique constraint violation for duplicate email
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Find a user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find a user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Get all users (admin only)
   */
  static async findAll(): Promise<User[]> {
    const query = `
      SELECT id, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Update a user
   */
  static async update(id: string, updates: Partial<Pick<User, 'email' | 'role'>>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }

    if (updates.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(updates.role);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt"
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Update user password
   */
  static async updatePassword(id: string, newPassword: string): Promise<User | null> {
    const passwordHash = await this.hashPassword(newPassword);
    
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt"
    `;

    const result = await pool.query(query, [passwordHash, id]);
    return result.rows[0] || null;
  }

  /**
   * Delete a user
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM users WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const query = `SELECT 1 FROM users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    return result.rows.length > 0;
  }

  /**
   * Count total users
   */
  static async count(): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM users`;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10);
  }
}
