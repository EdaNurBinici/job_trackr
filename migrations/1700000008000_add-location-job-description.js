/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add location and job_description columns to applications table
  pgm.addColumns('applications', {
    location: {
      type: 'varchar(255)',
      notNull: false
    },
    job_description: {
      type: 'text',
      notNull: false
    }
  });
};

exports.down = (pgm) => {
  // Remove location and job_description columns
  pgm.dropColumns('applications', ['location', 'job_description']);
};
