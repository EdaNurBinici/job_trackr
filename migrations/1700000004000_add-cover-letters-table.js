exports.up = (pgm) => {
  pgm.createTable('cover_letters', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    cv_file_id: {
      type: 'uuid',
      references: 'cv_files(id)',
      onDelete: 'SET NULL',
    },
    application_id: {
      type: 'uuid',
      references: 'applications(id)',
      onDelete: 'SET NULL',
    },
    company_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    position: {
      type: 'varchar(255)',
      notNull: true,
    },
    tone: {
      type: 'varchar(50)',
      notNull: true,
    },
    language: {
      type: 'varchar(10)',
      notNull: true,
    },
    content: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });
  pgm.createIndex('cover_letters', 'user_id', {
    name: 'idx_cover_letters_user',
  });
  pgm.createIndex('cover_letters', 'application_id', {
    name: 'idx_cover_letters_application',
  });
  pgm.createIndex('cover_letters', 'created_at', {
    name: 'idx_cover_letters_created_at',
  });
};
exports.down = (pgm) => {
  pgm.dropTable('cover_letters');
};
