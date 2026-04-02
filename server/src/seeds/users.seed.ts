/**
 * User Seed Script
 *
 * Populates the database with randomly generated verified user accounts.
 * Existing emails are skipped so the script is safe to run multiple times.
 *
 * Prerequisites:
 *   - The database must be running and configured in .env
 *
 * Usage:
 *   npm run seed:users               # seeds 10 users
 *   npm run seed:users -- --count=50 # seeds 50 users
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

import { User, UserRole } from '../users/entities/user.entity';

const DEFAULT_PASSWORD = 'Password1!';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 10;

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const email = faker.internet.email().toLowerCase();
    const existing = await userRepo.findOne({ where: { email } });

    if (existing) {
      skipped++;
      continue;
    }

    const user = userRepo.create({
      email,
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: true,
      isSuspended: false,
    });

    await userRepo.save(user);
    created++;
  }

  console.log(`✅ Seeded ${created} user(s) (${skipped} skipped — email already existed)`);
  console.log(`   Default password for all seeded users: ${DEFAULT_PASSWORD}`);

  await app.close();
}

seed().catch((err) => {
  console.error('❌ User seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
