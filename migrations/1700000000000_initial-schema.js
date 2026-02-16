/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create application_status enum
  pgm.createType('application_status', ['Applied', 'Interview', 'Offer', 'Rejected']);

  // Create audit_action enum
  pgm.createType('audit_action', ['CREATE', 'UPDATE', 'DELETE']);

  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true
    },
    role: {
      type: 'varchar(20)',
      notNull: true,
      default: 'user'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create index on users email
  pgm.createIndex('users', 'email', { name: 'idx_users_email' });

  // Create applications table
  pgm.createTable('applications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE'
    },
    company_name: {
      type: 'varchar(255)',
      notNull: true
    },
    position: {
      type: 'varchar(255)',
      notNull: true
    },
    status: {
      type: 'application_status',
      notNull: true,
      default: 'Applied'
    },
    application_date: {
      type: 'date',
      notNull: true
    },
    notes: {
      type: 'text'
    },
    source_link: {
      type: 'varchar(500)'
    },
    reminder_date: {
      type: 'date'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create indexes on applications
  pgm.createIndex('applications', 'user_id', { name: 'idx_applications_user_id' });
  pgm.createIndex('applications', 'status', { name: 'idx_applications_status' });
  pgm.createIndex('applications', 'application_date', { name: 'idx_applications_date' });
  pgm.createIndex('applications', 'company_name', { name: 'idx_applications_company' });

  // Create files table
  pgm.createTable('files', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications(id)',
      onDelete: 'CASCADE'
    },
    file_name: {
      type: 'varchar(255)',
      notNull: true
    },
    file_size: {
      type: 'integer',
      notNull: true
    },
    mime_type: {
      type: 'varchar(100)',
      notNull: true
    },
    storage_path: {
      type: 'varchar(500)',
      notNull: true
    },
    uploaded_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create index on files
  pgm.createIndex('files', 'application_id', { name: 'idx_files_application_id' });

  // Create audit_log table
  pgm.createTable('audit_log', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)'
    },
    entity: {
      type: 'varchar(50)',
      notNull: true
    },
    entity_id: {
      type: 'uuid',
      notNull: true
    },
    action: {
      type: 'audit_action',
      notNull: true
    },
    before_data: {
      type: 'jsonb'
    },
    after_data: {
      type: 'jsonb'
    },
    timestamp: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create indexes on audit_log
  pgm.createIndex('audit_log', 'user_id', { name: 'idx_audit_user_id' });
  pgm.createIndex('audit_log', ['entity', 'entity_id'], { name: 'idx_audit_entity' });
  pgm.createIndex('audit_log', 'timestamp', { name: 'idx_audit_timestamp' });
};

exports.down = (pgm) => {
  // Drop tables in reverse order
  pgm.dropTable('audit_log');
  pgm.dropTable('files');
  pgm.dropTable('applications');
  pgm.dropTable('users');

  // Drop types
  pgm.dropType('audit_action');
  pgm.dropType('application_status');
};
