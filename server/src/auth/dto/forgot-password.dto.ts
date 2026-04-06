/**
 * forgot-password.dto.ts — Request body for POST /auth/forgot-password.
 * Validates that the supplied address is a valid email.
 */
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;
}
