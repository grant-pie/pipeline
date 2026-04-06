/**
 * admin.module.ts — Admin feature module.
 *
 * Registers direct TypeORM access to User and Job entities (needed for complex
 * queries and chart aggregations), and wires in UsersModule, MailModule, and
 * AuditLogModule as dependencies of AdminService.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Job]), UsersModule, MailModule, AuditLogModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
