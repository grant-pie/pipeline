/**
 * Job Seed Script
 *
 * Populates the database with randomly generated job applications.
 * Jobs are distributed randomly across all existing users in the database,
 * or scoped to a single user when --email= is provided.
 *
 * Prerequisites:
 *   - The database must be running and configured in .env
 *   - At least one user account must exist (register via the app first)
 *
 * Usage:
 *   npm run seed:jobs                                    # seeds 1 job across all users
 *   npm run seed:jobs -- --count=50                      # seeds 50 jobs across all users
 *   npm run seed:jobs -- --email=user@example.com        # seeds 1 job for a specific user
 *   npm run seed:jobs -- --count=20 --email=u@example.com # seeds 20 jobs for a specific user
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
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });

  const jobRepo = app.get<Repository<Job>>(getRepositoryToken(Job));
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 1;

  const emailArg = process.argv.find((a) => a.startsWith('--email='));
  const email = emailArg?.split('=')[1]?.trim();

  let userIds: string[];

  if (email) {
    const user = await userRepo.findOne({ where: { email }, select: ['id'] });
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      await app.close();
      process.exit(1);
    }
    userIds = [user.id];
    console.log(`📧 Seeding jobs for ${email}`);
  } else {
    const users = await userRepo.find({ select: ['id'] });
    if (users.length === 0) {
      console.error('❌ No users found in the database. Create an account first.');
      await app.close();
      process.exit(1);
    }
    userIds = users.map(u => u.id);
  }

  const jobs = Array.from({ length: count }).map(() =>
    generateFakeJob(faker.helpers.arrayElement(userIds)),
  );

  await jobRepo.save(jobs);

  const scope = email ? `for ${email}` : `across ${userIds.length} user(s)`;
  console.log(`✅ Seeded ${jobs.length} job(s) ${scope}`);

  await app.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
