import { ConfigService } from '@nestjs/config';

export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret || secret.trim().length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long.');
  }
  return secret;
}
