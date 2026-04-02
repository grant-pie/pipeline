/**
 * make-admin
 *
 * Promotes an existing user to admin by email address.
 * Intended for the initial production bootstrap — run once after first deployment
 * to grant admin access to the first account.
 *
 * Usage:
 *   npm run make-admin -- admin@example.com
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';

async function run() {
  const email = process.argv[2]?.trim();

  if (!email) {
    console.error('Usage: npm run make-admin -- <email>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const user = await userRepo.findOne({ where: { email } });

  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    await app.close();
    process.exit(1);
  }

  if (user.role === UserRole.ADMIN) {
    console.log(`ℹ️  ${email} is already an admin. No changes made.`);
    await app.close();
    return;
  }

  await userRepo.update(user.id, { role: UserRole.ADMIN });
  console.log(`✅ ${email} has been promoted to admin.`);

  await app.close();
}

run().catch((err) => {
  console.error('❌ make-admin failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
