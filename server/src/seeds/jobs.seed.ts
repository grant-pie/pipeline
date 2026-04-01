/**
 * Job Seed Script
 *
 * Populates the database with randomly generated job applications.
 * Jobs are distributed randomly across all existing users in the database.
 *
 * Prerequisites:
 *   - The database must be running and configured in .env
 *   - At least one user account must exist (register via the app first)
 *
 * Usage:
 *   npm run seed:jobs               # seeds 1 job
 *   npm run seed:jobs -- --count=50 # seeds 50 jobs
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';

import { Job, JOB_STATUSES } from '../jobs/entities/job.entity';
import { User } from '../users/entities/user.entity';

const generateFakeJob = (userId: string): Partial<Job> => ({
  company: faker.company.name().slice(0, 100),
  title: faker.person.jobTitle().slice(0, 100),
  dateApplied: faker.date.past({ years: 1 }).toISOString(),
  status: faker.helpers.arrayElement(JOB_STATUSES),
  notes: faker.datatype.boolean()
    ? faker.lorem.paragraph().slice(0, 2000)
    : null,
  link: faker.datatype.boolean()
    ? faker.internet.url().slice(0, 500)
    : null,
  userId,
});

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const jobRepo = app.get<Repository<Job>>(getRepositoryToken(Job));
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const users = await userRepo.find({ select: ['id'] });

  if (users.length === 0) {
    throw new Error('❌ No users found in the database. Create an account first.');
  }

  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 1;

  const jobs = Array.from({ length: count }).map(() => {
    const userId = faker.helpers.arrayElement(users).id;
    return generateFakeJob(userId);
  });

  await jobRepo.save(jobs);

  console.log(`✅ Seeded ${jobs.length} jobs across ${users.length} user(s)`);

  await app.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
