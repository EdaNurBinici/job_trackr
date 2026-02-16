exports.up = async (pgm) => {
  // Add email verification columns
  pgm.addColumns('users', {
    email_verified: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    verification_token: {
      type: 'varchar(255)',
      notNull: false,
    },
    verification_token_expires: {
      type: 'timestamp',
      notNull: false,
    },
    reset_password_token: {
      type: 'varchar(255)',
      notNull: false,
    },
    reset_password_expires: {
      type: 'timestamp',
      notNull: false,
    },
    google_id: {
      type: 'varchar(255)',
      notNull: false,
      unique: true,
    },
  });

  // Add index for tokens
  pgm.createIndex('users', 'verification_token');
  pgm.createIndex('users', 'reset_password_token');
  pgm.createIndex('users', 'google_id');
};

exports.down = async (pgm) => {
  pgm.dropColumns('users', [
    'email_verified',
    'verification_token',
    'verification_token_expires',
    'reset_password_token',
    'reset_password_expires',
    'google_id',
  ]);
};
