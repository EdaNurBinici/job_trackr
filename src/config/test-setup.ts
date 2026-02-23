import { pool } from './database';
export async function setupTestDatabase(): Promise<void> {
}
export async function teardownTestDatabase(): Promise<void> {
  await pool.end();
}
export async function cleanupTestData(): Promise<void> {
  await pool.query('DELETE FROM audit_log');
  await pool.query('DELETE FROM files');
  await pool.query('DELETE FROM applications');
  await pool.query('DELETE FROM users');
}
