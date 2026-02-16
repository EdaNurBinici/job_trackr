/**
 * Migration: Add cv_analyses table
 * Phase 2: AI Resume Analyst
 */

exports.up = (pgm) => {
  // Create cv_analyses table
  pgm.createTable('cv_analyses', {
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
    cv_file_id: {
      type: 'uuid',
      notNull: true,
      references: 'cv_files',
      onDelete: 'CASCADE',
    },
    job_description: {
      type: 'text',
      notNull: true,
    },
    job_url: {
      type: 'text',
    },
    match_score: {
      type: 'integer',
      notNull: true,
      check: 'match_score >= 0 AND match_score <= 100',
    },
    missing_skills: {
      type: 'text[]',
      notNull: true,
      default: '{}',
    },
    recommendations: {
      type: 'text[]',
      notNull: true,
      default: '{}',
    },
    ai_response: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Create indexes
  pgm.createIndex('cv_analyses', 'user_id');
  pgm.createIndex('cv_analyses', 'cv_file_id');
  pgm.createIndex('cv_analyses', 'match_score', { method: 'btree' });
  pgm.createIndex('cv_analyses', 'created_at', { method: 'btree' });

  // Add comment
  pgm.sql(`
    COMMENT ON TABLE cv_analyses IS 'Stores AI-powered CV analysis results';
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('cv_analyses');
};
