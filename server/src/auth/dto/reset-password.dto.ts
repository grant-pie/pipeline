/**
 * reset-password.dto.ts — Request body for POST /auth/reset-password.
 * Validates the one-time reset token and the new password (min 8 chars).
 */
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
