/**
 * mail.service.ts — Transactional email service.
 *
 * Sends emails via the Resend SDK. The from address and app URL are read from
 * env vars (MAIL_FROM, APP_URL) so the same code works in local dev and
 * production without changes. Any Resend API error is logged and re-thrown as
 * a 500 so callers can handle it uniformly.
 */
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get('RESEND_API_KEY'));
  }

  /**
   * Sends a verification email containing a one-click confirm link.
   * The link points to APP_URL/verify-email?token=<rawToken>.
   *
   * @param email - The recipient's email address.
   * @param token - The raw (unhashed) verification token to embed in the link.
   * @throws InternalServerErrorException if Resend returns an error.
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const appUrl = this.config.get('APP_URL', 'http://localhost:5173');
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: this.config.get('MAIL_FROM', 'onboarding@resend.dev'),
      to: email,
      subject: 'Verify your Pipeline account',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="margin-bottom: 8px;">Verify your email</h2>
          <p style="color: #888; margin-bottom: 24px;">
            Thanks for signing up for Pipeline. Click the button below to verify your email address.
          </p>
          <a href="${verifyUrl}"
            style="display: inline-block; background: #5b8af0; color: #fff;
                   padding: 10px 20px; border-radius: 6px; text-decoration: none;
                   font-weight: 500;">
            Verify email
          </a>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send verification email to ${email}: ${error.message}`);
      throw new InternalServerErrorException('Failed to send verification email.');
    }
  }

  /**
   * Sends a password reset email containing a one-click reset link (expires in 1 hour).
   * The link points to APP_URL/reset-password?token=<rawToken>.
   *
   * @param email - The recipient's email address.
   * @param token - The raw (unhashed) reset token to embed in the link.
   * @throws InternalServerErrorException if Resend returns an error.
   */
  async sendPasswordReset(email: string, token: string): Promise<void> {
    const appUrl = this.config.get('APP_URL', 'http://localhost:5173');
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: this.config.get('MAIL_FROM', 'onboarding@resend.dev'),
      to: email,
      subject: 'Reset your Pipeline password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="margin-bottom: 8px;">Reset your password</h2>
          <p style="color: #888; margin-bottom: 24px;">
            You requested a password reset for your Pipeline account.
            Click the button below to choose a new password.
            This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}"
            style="display: inline-block; background: #5b8af0; color: #fff;
                   padding: 10px 20px; border-radius: 6px; text-decoration: none;
                   font-weight: 500;">
            Reset password
          </a>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
      throw new InternalServerErrorException('Failed to send reset email.');
    }
  }
}
