/**
 * app.module.ts — Root application module.
 *
 * Wires together all feature modules and configures global providers:
 *   - ConfigModule (global env vars via @nestjs/config).
 *   - ThrottlerModule (120 req/min global rate limit, applied via APP_GUARD).
 *   - TypeOrmModule (PostgreSQL; schema sync disabled in production).
 *   - AuthModule, JobsModule, UsersModule, AdminModule.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { User } from './users/entities/user.entity';
import { Job } from './jobs/entities/job.entity';
import { AuditLog } from './audit-log/audit-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'pipeline',
      entities: [User, Job, AuditLog],
      // synchronize is only enabled in non-production environments.
      // In production, schema changes are applied via TypeORM migrations.
      synchronize: process.env.NODE_ENV !== 'production',
      migrations: ['dist/migrations/*.js'],
      migrationsRun: process.env.NODE_ENV === 'production',
      migrationsTableName: 'typeorm_migrations',
    }),
    AuthModule,
    JobsModule,
    UsersModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
