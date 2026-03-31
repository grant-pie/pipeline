import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';
import { ForgotPasswordDto } from './forgot-password.dto';
import { ResetPasswordDto } from './reset-password.dto';
import { ResendVerificationDto } from './resend-verification.dto';

// Convenience: transform a plain object into a DTO class instance and validate it.
// Returns the array of ValidationErrors (empty = valid).
async function validateDto<T extends object>(
  DtoClass: new () => T,
  plain: object,
): Promise<string[]> {
  const instance = plainToInstance(DtoClass, plain);
  const errors = await validate(instance as object);
  return errors.map((e) => Object.values(e.constraints ?? {}).join(', '));
}

// ---------------------------------------------------------------------------
// RegisterDto
// ---------------------------------------------------------------------------
describe('RegisterDto', () => {
  it('passes with a valid email and password', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'user@example.com',
      password: 'password123',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when email is missing', async () => {
    const errors = await validateDto(RegisterDto, { password: 'password123' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when email is not a valid email address', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'not-an-email',
      password: 'password123',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when email exceeds 255 characters', async () => {
    const errors = await validateDto(RegisterDto, {
      email: `${'a'.repeat(245)}@example.com`,
      password: 'password123',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password is missing', async () => {
    const errors = await validateDto(RegisterDto, { email: 'user@example.com' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password is shorter than 8 characters', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'user@example.com',
      password: 'short',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes when password is exactly 8 characters (boundary)', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'user@example.com',
      password: '12345678',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when password exceeds 128 characters', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'user@example.com',
      password: 'a'.repeat(129),
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes when password is exactly 128 characters (boundary)', async () => {
    const errors = await validateDto(RegisterDto, {
      email: 'user@example.com',
      password: 'a'.repeat(128),
    });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// LoginDto
// ---------------------------------------------------------------------------
describe('LoginDto', () => {
  it('passes with a valid email and password', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'user@example.com',
      password: 'anypassword',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when email is not a valid address', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'bad-email',
      password: 'anypassword',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when email exceeds 255 characters', async () => {
    const errors = await validateDto(LoginDto, {
      email: `${'a'.repeat(245)}@example.com`,
      password: 'anypassword',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password is missing', async () => {
    const errors = await validateDto(LoginDto, { email: 'user@example.com' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password is an empty string', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'user@example.com',
      password: '',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password exceeds 128 characters', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'user@example.com',
      password: 'a'.repeat(129),
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ForgotPasswordDto
// ---------------------------------------------------------------------------
describe('ForgotPasswordDto', () => {
  it('passes with a valid email', async () => {
    const errors = await validateDto(ForgotPasswordDto, { email: 'user@example.com' });
    expect(errors).toHaveLength(0);
  });

  it('fails when email is missing', async () => {
    const errors = await validateDto(ForgotPasswordDto, {});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when email is not a valid address', async () => {
    const errors = await validateDto(ForgotPasswordDto, { email: 'not-an-email' });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ResetPasswordDto
// ---------------------------------------------------------------------------
describe('ResetPasswordDto', () => {
  it('passes with a valid token and password', async () => {
    const errors = await validateDto(ResetPasswordDto, {
      token: 'some-reset-token',
      password: 'newpassword123',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when token is missing', async () => {
    const errors = await validateDto(ResetPasswordDto, { password: 'newpassword123' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when token is an empty string', async () => {
    const errors = await validateDto(ResetPasswordDto, {
      token: '',
      password: 'newpassword123',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password is missing', async () => {
    const errors = await validateDto(ResetPasswordDto, { token: 'some-token' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when password is shorter than 8 characters', async () => {
    const errors = await validateDto(ResetPasswordDto, {
      token: 'some-token',
      password: 'short',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes when password is exactly 8 characters (boundary)', async () => {
    const errors = await validateDto(ResetPasswordDto, {
      token: 'some-token',
      password: '12345678',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when password exceeds 128 characters', async () => {
    const errors = await validateDto(ResetPasswordDto, {
      token: 'some-token',
      password: 'a'.repeat(129),
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ResendVerificationDto
// ---------------------------------------------------------------------------
describe('ResendVerificationDto', () => {
  it('passes with a valid email', async () => {
    const errors = await validateDto(ResendVerificationDto, { email: 'user@example.com' });
    expect(errors).toHaveLength(0);
  });

  it('fails when email is missing', async () => {
    const errors = await validateDto(ResendVerificationDto, {});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when email is not a valid address', async () => {
    const errors = await validateDto(ResendVerificationDto, { email: 'bad' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when email is an empty string', async () => {
    const errors = await validateDto(ResendVerificationDto, { email: '' });
    expect(errors.length).toBeGreaterThan(0);
  });
});
