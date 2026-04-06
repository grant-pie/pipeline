/**
 * jwt-secret.util.ts — JWT secret validation helper.
 *
 * Centralises the check that JWT_SECRET is both present and long enough so that
 * the same validation logic is applied consistently in both AuthModule (at
 * startup) and JwtStrategy (when the Passport strategy is initialised).
 */
import { ConfigService } from '@nestjs/config';

/**
 * Reads JWT_SECRET from config and throws if it is absent or shorter than 32 characters.
 *
 * @param config - The NestJS ConfigService instance.
 * @returns The validated JWT secret string.
 * @throws Error if JWT_SECRET is missing or too short.
 */
export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret || secret.trim().length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long.');
  }
  return secret;
}
