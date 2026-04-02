/**
 * Admin Seed Script
 *
 * Creates a default admin account for local development.
 * If the email already exists the account is promoted to admin and force-verified.
 * If it does not exist a new verified admin account is created.
 *
 * Credentials are read from environment variables so they never need to be
 * hard-coded and are kept out of version control via .env (gitignored).
 *
 * Prerequisites:
 *   - The database must be running and configured in .env
 *   - ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in .env
 *
 * Usage:
 *   npm run seed:admin
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';

async function seed() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in .env before running this script.',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const existing = await userRepo.findOne({ where: { email } });

  if (existing) {
    await userRepo.update(existing.id, {
      role: UserRole.ADMIN,
      isVerified: true,
      isSuspended: false,
    });
    console.log(`✅ Existing account ${email} promoted to admin.`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepo.create({
      email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
      isSuspended: false,
    });
    await userRepo.save(user);
    console.log(`✅ Admin account created: ${email}`);
  }

  await app.close();
}

seed().catch((err) => {
  console.error('❌ Admin seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
