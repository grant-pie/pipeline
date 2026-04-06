/**
 * audit-log.module.ts — Audit log feature module.
 *
 * Provides AuditLogService (backed by the AuditLog TypeORM repository) and
 * exports it for use by AdminModule, which performs all write operations.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
