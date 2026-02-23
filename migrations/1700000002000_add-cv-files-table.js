exports.up = (pgm) => {
  pgm.createTable('cv_files', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    file_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    original_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    s3_key: {
      type: 'varchar(500)',
      notNull: true,
    },
    file_size: {
      type: 'integer',
      notNull: true,
    },
    mime_type: {
      type: 'varchar(100)',
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
  pgm.createIndex('cv_files', 'user_id');
  pgm.addColumn('files', {
    s3_key: {
      type: 'varchar(500)',
      notNull: false,
    },
  });
  pgm.createIndex('files', 's3_key');
};
exports.down = (pgm) => {
  pgm.dropTable('cv_files');
  pgm.dropColumn('files', 's3_key');
};
