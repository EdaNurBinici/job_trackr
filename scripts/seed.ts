/**
 * Seed Data Script for JobTrackr
 * Populates the database with sample users, applications, and files
 */

import { pool, testConnection } from '../src/config/database';
import { UserModel } from '../src/models/user.model';
import { ApplicationModel } from '../src/models/application.model';
import { ApplicationStatus } from '../src/types';

async function seed() {
  try {
    console.log('Starting database seeding...');
    
    // Test connection
    await testConnection();

    // Create sample users
    console.log('Creating sample users...');
    const adminUser = await UserModel.create('admin@jobtrackr.com', 'admin123', 'admin');
    const user1 = await UserModel.create('john.doe@example.com', 'password123', 'user');
    const user2 = await UserModel.create('jane.smith@example.com', 'password123', 'user');

    console.log(`Created users: ${adminUser.email}, ${user1.email}, ${user2.email}`);

    // Sample companies and positions
    const companies = [
      'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta',
      'Netflix', 'Tesla', 'SpaceX', 'Airbnb', 'Uber'
    ];

    const positions = [
      'Software Engineer', 'Senior Software Engineer', 'Staff Engineer',
      'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
      'DevOps Engineer', 'Data Scientist', 'Product Manager', 'Engineering Manager'
    ];

    const statuses: ApplicationStatus[] = ['Applied', 'Interview', 'Offer', 'Rejected'];

    // Create applications for user1
    console.log('Creating applications for user1...');
    for (let i = 0; i < 15; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const daysAgo = Math.floor(Math.random() * 60);
      const applicationDate = new Date();
      applicationDate.setDate(applicationDate.getDate() - daysAgo);

      await ApplicationModel.create(user1.id, {
        companyName: company,
        position: position,
        status: status,
        applicationDate: applicationDate.toISOString().split('T')[0],
        notes: `Application for ${position} at ${company}. ${status === 'Interview' ? 'Interview scheduled for next week.' : ''}`,
        sourceLink: `https://careers.${company.toLowerCase()}.com/jobs/${i}`
      });
    }

    // Create applications for user2
    console.log('Creating applications for user2...');
    for (let i = 0; i < 10; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const daysAgo = Math.floor(Math.random() * 45);
      const applicationDate = new Date();
      applicationDate.setDate(applicationDate.getDate() - daysAgo);

      await ApplicationModel.create(user2.id, {
        companyName: company,
        position: position,
        status: status,
        applicationDate: applicationDate.toISOString().split('T')[0],
        notes: `Excited about this ${position} opportunity!`,
        sourceLink: `https://jobs.${company.toLowerCase()}.com/${i}`
      });
    }

    console.log('Database seeding completed successfully!');
    console.log('\nSample credentials:');
    console.log('Admin: admin@jobtrackr.com / admin123');
    console.log('User 1: john.doe@example.com / password123');
    console.log('User 2: jane.smith@example.com / password123');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed function
seed().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
