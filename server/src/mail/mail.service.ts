import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: process.env.MAIL_FROM || 'onboarding@resend.dev',
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
      throw new InternalServerErrorException('Failed to send reset email.');
    }
  }
}
