import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from './jwt-secret.util';

function makeConfig(secret: string | undefined): ConfigService {
  return { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService;
}

describe('getJwtSecret()', () => {
  it('returns the secret when it is at least 32 characters', () => {
    const secret = 'a'.repeat(32);
    const result = getJwtSecret(makeConfig(secret));
    expect(result).toBe(secret);
  });

  it('returns the secret when it is longer than 32 characters', () => {
    const secret = 'a'.repeat(64);
    const result = getJwtSecret(makeConfig(secret));
    expect(result).toBe(secret);
  });

  it('passes when secret is exactly 32 characters (boundary)', () => {
    const secret = 'a'.repeat(32);
    expect(() => getJwtSecret(makeConfig(secret))).not.toThrow();
  });

  it('throws when JWT_SECRET is undefined', () => {
    expect(() => getJwtSecret(makeConfig(undefined))).toThrow(
      'JWT_SECRET must be set and at least 32 characters long.',
    );
  });

  it('throws when JWT_SECRET is an empty string', () => {
    expect(() => getJwtSecret(makeConfig(''))).toThrow(
      'JWT_SECRET must be set and at least 32 characters long.',
    );
  });

  it('throws when JWT_SECRET is shorter than 32 characters', () => {
    expect(() => getJwtSecret(makeConfig('tooshort'))).toThrow(
      'JWT_SECRET must be set and at least 32 characters long.',
    );
  });

  it('throws when JWT_SECRET is exactly 31 characters (boundary)', () => {
    expect(() => getJwtSecret(makeConfig('a'.repeat(31)))).toThrow(
      'JWT_SECRET must be set and at least 32 characters long.',
    );
  });

  it('throws when JWT_SECRET is only whitespace (trimmed length < 32)', () => {
    expect(() => getJwtSecret(makeConfig('   '))).toThrow(
      'JWT_SECRET must be set and at least 32 characters long.',
    );
  });

  it('throws when JWT_SECRET is 32 chars of whitespace (trimmed to 0)', () => {
    expect(() => getJwtSecret(makeConfig(' '.repeat(32)))).toThrow(
      'JWT_SECRET must be set and at least 32 characters long.',
    );
  });

  it('calls config.get with the key "JWT_SECRET"', () => {
    const config = makeConfig('a'.repeat(32));
    getJwtSecret(config);
    expect(config.get).toHaveBeenCalledWith('JWT_SECRET');
  });
});
