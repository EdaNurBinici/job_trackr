import fc from 'fast-check';
import { UserModel } from '../user.model';
import { pool } from '../../config/database';

/**
 * Property-Based Tests for User Registration
 * Feature: job-trackr
 */

describe('User Registration - Property-Based Tests', () => {
  // Clean up test data after each test
  afterEach(async () => {
    // Clean up audit_log first (foreign key constraint)
    await pool.query('DELETE FROM audit_log WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['%@pbt-test.com']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@pbt-test.com']);
  });

  afterAll(async () => {
    // Clean up - don't close the pool as other tests may need it
  });

  /**
   * Property 1: Valid registration creates user account
   * **Validates: Requirements 1.1**
   * 
   * For any valid email and password (meeting format and length requirements),
   * registering should create a user account that can be retrieved from the database.
   */
  test(
    'Property 1: Valid registration creates user account',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid email addresses
          fc.record({
            localPart: fc.stringMatching(/^[a-z0-9]{1,20}$/),
            domain: fc.constantFrom('pbt-test.com'), // Use consistent domain for cleanup
          }).map(({ localPart, domain }) => `${localPart}@${domain}`),
          // Generate valid passwords (minimum 8 characters as per Requirements 12.3)
          fc.string({ minLength: 8, maxLength: 50 }),
          async (email, password) => {
            // Register the user
            const createdUser = await UserModel.create(email, password);

            // Verify user was created with correct properties
            expect(createdUser).toBeDefined();
            expect(createdUser.id).toBeDefined();
            expect(createdUser.email).toBe(email);
            expect(createdUser.passwordHash).toBeDefined();
            expect(createdUser.passwordHash).not.toBe(password); // Password should be hashed
            expect(createdUser.role).toBe('user'); // Default role
            expect(createdUser.createdAt).toBeDefined();
            expect(createdUser.updatedAt).toBeDefined();

            // Verify user can be retrieved from database by ID
            const retrievedById = await UserModel.findById(createdUser.id);
            expect(retrievedById).not.toBeNull();
            expect(retrievedById?.id).toBe(createdUser.id);
            expect(retrievedById?.email).toBe(email);
            expect(retrievedById?.passwordHash).toBe(createdUser.passwordHash);

            // Verify user can be retrieved from database by email
            const retrievedByEmail = await UserModel.findByEmail(email);
            expect(retrievedByEmail).not.toBeNull();
            expect(retrievedByEmail?.id).toBe(createdUser.id);
            expect(retrievedByEmail?.email).toBe(email);

            // Verify password can be validated
            const isPasswordValid = await UserModel.comparePassword(password, createdUser.passwordHash);
            expect(isPasswordValid).toBe(true);

            // Clean up this specific user to avoid duplicate email errors in subsequent runs
            await UserModel.delete(createdUser.id);
          }
        ),
        { numRuns: 100 }
      );
    },
    30000 // 30 second timeout for property-based test with 100 runs
  );

  /**
   * Property 2: Duplicate email registration rejected
   * **Validates: Requirements 1.2**
   * 
   * For any user that has already been registered, attempting to register again
   * with the same email should be rejected with an error.
   */
  test(
    'Property 2: Duplicate email registration rejected',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid email addresses
          fc.record({
            localPart: fc.stringMatching(/^[a-z0-9]{1,20}$/),
            domain: fc.constantFrom('pbt-test.com'),
          }).map(({ localPart, domain }) => `${localPart}@${domain}`),
          // Generate two different passwords
          fc.string({ minLength: 8, maxLength: 50 }),
          fc.string({ minLength: 8, maxLength: 50 }),
          async (email, password1, password2) => {
            // Register the user first time
            const firstUser = await UserModel.create(email, password1);
            expect(firstUser).toBeDefined();
            expect(firstUser.email).toBe(email);

            // Attempt to register with the same email should throw an error
            await expect(UserModel.create(email, password2)).rejects.toThrow();

            // Verify only one user exists with this email
            const foundUser = await UserModel.findByEmail(email);
            expect(foundUser).not.toBeNull();
            expect(foundUser?.id).toBe(firstUser.id);

            // Verify the original user's password is still valid (not overwritten)
            const isOriginalPasswordValid = await UserModel.comparePassword(
              password1,
              foundUser!.passwordHash
            );
            expect(isOriginalPasswordValid).toBe(true);

            // Clean up
            await UserModel.delete(firstUser.id);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000 // 60 second timeout for property-based test with 100 runs
  );
});
