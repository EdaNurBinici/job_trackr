/**
 * Migration: Add reminder_sent table
 * Tracks which reminders have been sent to prevent duplicates
 */

exports.up = (pgm) => {
  // Create reminder_sent table
  pgm.createTable('reminder_sent', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications',
      onDelete: 'CASCADE',
      unique: true
    },
    sent_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create index on application_id for faster lookups
  pgm.createIndex('reminder_sent', 'application_id');
};

exports.down = (pgm) => {
  pgm.dropTable('reminder_sent');
};
