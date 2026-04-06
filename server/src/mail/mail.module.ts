/**
 * mail.module.ts — Transactional email module.
 *
 * Provides MailService (backed by the Resend SDK) and exports it so that
 * AuthModule and AdminModule can send emails without depending on ConfigModule directly.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [ConfigModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
