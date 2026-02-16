import { pool, testConnection } from '../src/config/database';

async function createReminderTable() {
  try {
    await testConnection();
    
    console.log('Creating reminder_sent table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminder_sent (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
        sent_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reminder_sent_application_id ON reminder_sent(application_id)
    `);
    
    console.log('reminder_sent table created successfully!');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await pool.end();
  }
}

createReminderTable();
