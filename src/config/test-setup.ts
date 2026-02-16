import { pool } from './database';

// Setup function to run before all tests
export async function setupTestDatabase(): Promise<void> {
  // This can be extended to set up test-specific database configuration
  // For now, we'll use the same pool but in tests we should use a separate test database
}

// Cleanup function to run after all tests
export async function teardownTestDatabase(): Promise<void> {
  await pool.end();
}

// Helper to clean up test data
export async function cleanupTestData(): Promise<void> {
  await pool.query('DELETE FROM audit_log');
  await pool.query('DELETE FROM files');
  await pool.query('DELETE FROM applications');
  await pool.query('DELETE FROM users');
}
