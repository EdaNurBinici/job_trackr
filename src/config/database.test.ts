import { pool, testConnection } from './database';

describe('Database Configuration', () => {
  afterAll(async () => {
    // Don't close the pool as other tests may need it
  });

  test('should establish database connection', async () => {
    await expect(testConnection()).resolves.not.toThrow();
  });

  test('should execute simple query', async () => {
    const result = await pool.query('SELECT 1 as value');
    expect(result.rows[0].value).toBe(1);
  });
});
