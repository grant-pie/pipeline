/**
 * login.dto.ts — Request body for POST /auth/login.
 * Validates that email is a valid address and password is a non-empty string.
 */
import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
