/**
 * Migration: Add Application Analyses Table
 * Sprint 1: AI Fit Score Analysis for Job Applications
 */

exports.up = async (pgm) => {
  // Create application_analyses table
  pgm.createTable('application_analyses', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications',
      onDelete: 'CASCADE',
    },
    cv_file_id: {
      type: 'uuid',
      notNull: true,
      references: 'cv_files',
      onDelete: 'CASCADE',
    },
    job_description_hash: {
      type: 'varchar(64)',
      notNull: true,
      comment: 'SHA-256 hash of job description to prevent duplicate API calls',
    },
    fit_score: {
      type: 'integer',
      notNull: true,
      check: 'fit_score >= 0 AND fit_score <= 100',
    },
    strengths: {
      type: 'jsonb',
      notNull: true,
      default: '[]',
      comment: 'Array of {point: string, cv_evidence: string}',
    },
    gaps: {
      type: 'jsonb',
      notNull: true,
      default: '[]',
      comment: 'Array of {point: string, impact: string}',
    },
    suggestions: {
      type: 'jsonb',
      notNull: true,
      default: '[]',
      comment: 'Array of actionable improvement suggestions',
    },
    ai_raw_response: {
      type: 'jsonb',
      notNull: false,
      comment: 'Full AI response for debugging',
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

  // Create indexes
  pgm.createIndex('application_analyses', 'application_id');
  pgm.createIndex('application_analyses', 'cv_file_id');
  pgm.createIndex('application_analyses', ['application_id', 'job_description_hash'], {
    unique: true,
    name: 'unique_application_job_hash',
  });
  pgm.createIndex('application_analyses', 'fit_score');
  pgm.createIndex('application_analyses', 'created_at');

  // Add comment
  pgm.sql(`
    COMMENT ON TABLE application_analyses IS 
    'AI-powered fit score analysis for job applications. Prevents duplicate API calls via job_description_hash.';
  `);
};

exports.down = async (pgm) => {
  pgm.dropTable('application_analyses');
};
