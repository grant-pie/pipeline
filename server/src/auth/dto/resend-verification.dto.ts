/**
 * resend-verification.dto.ts — Request body for POST /auth/resend-verification.
 * Validates that the supplied address is a valid email.
 */
import { IsEmail, MaxLength } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}
