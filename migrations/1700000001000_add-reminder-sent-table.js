exports.up = (pgm) => {
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
  pgm.createIndex('reminder_sent', 'application_id');
};
exports.down = (pgm) => {
  pgm.dropTable('reminder_sent');
};
