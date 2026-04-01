import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';

import { Job } from '../jobs/entities/job.entity';
import { JOB_STATUSES } from '../jobs/entities/job.entity';

const generateFakeJob = (userId: string): Partial<Job> => ({
  company: faker.company.name().slice(0, 100),
  title: faker.person.jobTitle().slice(0, 100),
  dateApplied: faker.date.past({ years: 1 }).toISOString(), // ✅ FIXED
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

  const userId = '29f162a3-3779-40d1-b45b-054d8aabb726';
  const count = parseInt(process.env.SEED_COUNT || '50', 10);

  if (!userId) {
    throw new Error('❌ SEED_USER_ID is required');
  }

  const jobs = Array.from({ length: count }).map(() =>
    generateFakeJob(userId),
  );

  await jobRepo.save(jobs);

  console.log(`✅ Seeded ${jobs.length} jobs`);

  await app.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});