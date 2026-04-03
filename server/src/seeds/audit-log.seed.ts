/**
 * Audit Log Seed Script
 *
 * Populates the audit_logs table with randomly generated entries.
 * Entries are distributed across all existing admin users as actors,
 * and target real users and jobs already in the database.
 *
 * Prerequisites:
 *   - The database must be running and configured in .env
 *   - At least one admin account must exist (run seed:admin first)
 *   - At least one regular user must exist (run seed:users first)
 *   - At least one job must exist for job-targeted actions (run seed:jobs first)
 *
 * Usage:
 *   npm run seed:audit-log               # seeds 20 entries
 *   npm run seed:audit-log -- --count=100 # seeds 100 entries
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';

import { AuditLog, AuditAction } from '../audit-log/audit-log.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';

const USER_ACTIONS: AuditAction[] = [
  AuditAction.SET_ROLE,
  AuditAction.SUSPEND_USER,
  AuditAction.UNSUSPEND_USER,
  AuditAction.DELETE_USER,
  AuditAction.FORCE_VERIFY,
  AuditAction.RESEND_VERIFICATION,
  AuditAction.TRIGGER_PASSWORD_RESET,
];

const JOB_ACTIONS: AuditAction[] = [
  AuditAction.UPDATE_JOB,
  AuditAction.DELETE_JOB,
  AuditAction.BULK_DELETE_JOBS,
];

function buildMetadata(action: AuditAction, targetUser?: User, targetJob?: Job): Record<string, unknown> {
  switch (action) {
    case AuditAction.SET_ROLE:
      return {
        targetEmail: targetUser?.email,
        newRole: faker.helpers.arrayElement([UserRole.ADMIN, UserRole.USER]),
      };
    case AuditAction.SUSPEND_USER:
    case AuditAction.UNSUSPEND_USER:
    case AuditAction.DELETE_USER:
    case AuditAction.FORCE_VERIFY:
    case AuditAction.RESEND_VERIFICATION:
    case AuditAction.TRIGGER_PASSWORD_RESET:
      return { targetEmail: targetUser?.email };
    case AuditAction.UPDATE_JOB:
      return {
        company: targetJob?.company,
        title: targetJob?.title,
        fields: faker.helpers.arrayElements(['status', 'notes', 'link', 'dateApplied'], { min: 1, max: 3 }),
      };
    case AuditAction.DELETE_JOB:
      return {
        company: targetJob?.company,
        title: targetJob?.title,
      };
    case AuditAction.BULK_DELETE_JOBS:
      return { count: faker.number.int({ min: 2, max: 20 }) };
    default:
      return {};
  }
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });

  const auditRepo = app.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const jobRepo = app.get<Repository<Job>>(getRepositoryToken(Job));

  const admins = await userRepo.find({ where: { role: UserRole.ADMIN } });
  if (admins.length === 0) {
    throw new Error('No admin accounts found. Run npm run seed:admin first.');
  }

  const users = await userRepo.find({ select: ['id', 'email'] });
  const jobs = await jobRepo.find({ select: ['id', 'company', 'title'] });

  if (jobs.length === 0) {
    console.warn('⚠️  No jobs found — job-targeted audit actions will be skipped.');
  }

  const availableActions = jobs.length > 0
    ? [...USER_ACTIONS, ...JOB_ACTIONS]
    : USER_ACTIONS;

  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 20;

  const entries: Partial<AuditLog>[] = [];

  for (let i = 0; i < count; i++) {
    const admin = faker.helpers.arrayElement(admins);
    const action = faker.helpers.arrayElement(availableActions);
    const isJobAction = JOB_ACTIONS.includes(action);

    const targetUser = isJobAction ? undefined : faker.helpers.arrayElement(users);
    const targetJob = isJobAction && jobs.length > 0
      ? faker.helpers.arrayElement(jobs)
      : undefined;

    entries.push({
      adminId: admin.id,
      adminEmail: admin.email,
      action,
      targetType: isJobAction ? 'job' : 'user',
      targetId: action === AuditAction.BULK_DELETE_JOBS ? null : (targetUser?.id ?? targetJob?.id),
      metadata: buildMetadata(action, targetUser, targetJob),
    });
  }

  await auditRepo.save(entries);

  console.log(`✅ Seeded ${entries.length} audit log entries using ${admins.length} admin(s)`);

  await app.close();
}

seed().catch((err) => {
  console.error('❌ Audit log seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
