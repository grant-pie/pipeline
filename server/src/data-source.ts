/**
 * data-source.ts — TypeORM DataSource for the CLI (migration generation and running).
 *
 * This file is NOT used by the NestJS application at runtime — it exists solely
 * so the TypeORM CLI (`typeorm migration:generate`, `migration:run`, etc.) has a
 * standalone DataSource to work with.
 *
 * Usage (from the server/ directory):
 *   npm run migration:generate -- src/migrations/InitialSchema
 *   npm run migration:run
 *   npm run migration:revert
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Job } from './jobs/entities/job.entity';
import { AuditLog } from './audit-log/audit-log.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'pipeline',
  entities: [User, Job, AuditLog],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
