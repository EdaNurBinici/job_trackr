exports.shorthands = undefined;
exports.up = (pgm) => {
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
  pgm.dropColumns('applications', ['location', 'job_description']);
};
