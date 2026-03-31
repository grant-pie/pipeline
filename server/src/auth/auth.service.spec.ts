import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';

// Helper — mirrors the private hashToken in auth.service.ts
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Factory for a minimal User object so tests aren't fragile to new fields
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    isVerified: true,
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date('2024-01-01'),
    jobs: [],
    ...overrides,
  } as User;
}

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            findByVerificationToken: jest.fn(),
            verifyUser: jest.fn(),
            setVerificationToken: jest.fn(),
            findByResetToken: jest.fn(),
            setResetToken: jest.fn(),
            updatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordReset: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // register()
  // ---------------------------------------------------------------------------
  describe('register()', () => {
    const dto = { email: 'new@example.com', password: 'password123' };

    it('creates the user and sends a verification email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(makeUser({ email: dto.email }));
      mailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(usersService.create).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: expect.any(String) });
    });

    it('stores a bcrypt hash of the password, not the plaintext', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(makeUser({ email: dto.email }));
      mailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.register(dto);

      const [, storedPassword] = usersService.create.mock.calls[0];
      expect(storedPassword).not.toBe(dto.password);
      const isHashed = await bcrypt.compare(dto.password, storedPassword);
      expect(isHashed).toBe(true);
    });

    it('stores a SHA256 hash of the verification token, sends the raw token to email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(makeUser({ email: dto.email }));
      mailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.register(dto);

      const [, , storedToken] = usersService.create.mock.calls[0];
      const [, emailToken] = mailService.sendVerificationEmail.mock.calls[0];

      // The stored token should be the SHA256 hash of the emailed raw token
      expect(storedToken).toBe(hashToken(emailToken));
      // The raw token should NOT equal its hash
      expect(emailToken).not.toBe(storedToken);
    });

    it('throws ConflictException when the email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // login()
  // ---------------------------------------------------------------------------
  describe('login()', () => {
    const plainPassword = 'password123';
    let hashedPassword: string;

    beforeEach(async () => {
      hashedPassword = await bcrypt.hash(plainPassword, 10);
    });

    it('returns accessToken and user data for a valid verified user', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: true });
      usersService.findByEmail.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('signed.jwt.token');

      const result = await service.login({ email: user.email, password: plainPassword });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({ id: user.id, email: user.email, createdAt: user.createdAt });
    });

    it('signs the JWT with { sub: id, email }', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: true });
      usersService.findByEmail.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('signed.jwt.token');

      await service.login({ email: user.email, password: plainPassword });

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email });
    });

    it('never exposes the password field in the response', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: true });
      usersService.findByEmail.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('token');

      const result = await service.login({ email: user.email, password: plainPassword });

      expect(result).not.toHaveProperty('password');
      expect((result as any).user?.password).toBeUndefined();
    });

    it('throws UnauthorizedException when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: plainPassword }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: true });
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({ email: user.email, password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('uses the same error message for unknown user and wrong password (no enumeration)', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: true });

      usersService.findByEmail.mockResolvedValue(null);
      let errorA: Error | null = null;
      try {
        await service.login({ email: 'nobody@example.com', password: plainPassword });
      } catch (e) {
        errorA = e as Error;
      }

      usersService.findByEmail.mockResolvedValue(user);
      let errorB: Error | null = null;
      try {
        await service.login({ email: user.email, password: 'wrongpassword' });
      } catch (e) {
        errorB = e as Error;
      }

      expect(errorA?.message).toBe(errorB?.message);
    });

    it('throws ForbiddenException when user exists but is not verified', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: false });
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({ email: user.email, password: plainPassword }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // verifyEmail()
  // ---------------------------------------------------------------------------
  describe('verifyEmail()', () => {
    it('marks the user as verified and returns a success message', async () => {
      const user = makeUser({ isVerified: false });
      usersService.findByVerificationToken.mockResolvedValue(user);
      usersService.verifyUser.mockResolvedValue(undefined);

      const result = await service.verifyEmail('raw-token');

      expect(usersService.verifyUser).toHaveBeenCalledWith(user.id);
      expect(result).toEqual({ message: expect.any(String) });
    });

    it('looks up the SHA256 hash of the token, not the raw token', async () => {
      const rawToken = 'raw-token-value';
      usersService.findByVerificationToken.mockResolvedValue(makeUser());
      usersService.verifyUser.mockResolvedValue(undefined);

      await service.verifyEmail(rawToken);

      expect(usersService.findByVerificationToken).toHaveBeenCalledWith(hashToken(rawToken));
      expect(usersService.findByVerificationToken).not.toHaveBeenCalledWith(rawToken);
    });

    it('throws BadRequestException for an unknown token', async () => {
      usersService.findByVerificationToken.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
      expect(usersService.verifyUser).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // resendVerification()
  // ---------------------------------------------------------------------------
  describe('resendVerification()', () => {
    it('generates a new token and sends it for an existing unverified user', async () => {
      const user = makeUser({ isVerified: false });
      usersService.findByEmail.mockResolvedValue(user);
      usersService.setVerificationToken.mockResolvedValue(undefined);
      mailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.resendVerification(user.email);

      expect(usersService.setVerificationToken).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);

      // Stored token must be the hash of the emailed token
      const [, storedToken] = usersService.setVerificationToken.mock.calls[0];
      const [, emailToken] = mailService.sendVerificationEmail.mock.calls[0];
      expect(storedToken).toBe(hashToken(emailToken));
    });

    it('returns the same message and sends no email for an unknown address', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.resendVerification('nobody@example.com');

      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ message: expect.any(String) });
    });

    it('returns the same message and sends no email for an already-verified user', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser({ isVerified: true }));

      const result = await service.resendVerification('test@example.com');

      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ message: expect.any(String) });
    });
  });

  // ---------------------------------------------------------------------------
  // forgotPassword()
  // ---------------------------------------------------------------------------
  describe('forgotPassword()', () => {
    it('stores a hashed reset token with a 1-hour expiry and sends the raw token', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user);
      usersService.setResetToken.mockResolvedValue(undefined);
      mailService.sendPasswordReset.mockResolvedValue(undefined);

      const before = Date.now();
      await service.forgotPassword({ email: user.email });
      const after = Date.now();

      expect(usersService.setResetToken).toHaveBeenCalledTimes(1);
      expect(mailService.sendPasswordReset).toHaveBeenCalledTimes(1);

      const [, storedHash, expiry] = usersService.setResetToken.mock.calls[0];
      const [, rawToken] = mailService.sendPasswordReset.mock.calls[0];

      expect(storedHash).toBe(hashToken(rawToken));

      const expiryMs = expiry.getTime();
      expect(expiryMs).toBeGreaterThanOrEqual(before + 60 * 60 * 1000);
      expect(expiryMs).toBeLessThanOrEqual(after + 60 * 60 * 1000);
    });

    it('returns the same message and takes no action for an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nobody@example.com' });

      expect(usersService.setResetToken).not.toHaveBeenCalled();
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
      expect(result).toEqual({ message: expect.any(String) });
    });

    it('returns the same message for existing and non-existing emails (no enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());
      usersService.setResetToken.mockResolvedValue(undefined);
      mailService.sendPasswordReset.mockResolvedValue(undefined);
      const resultA = await service.forgotPassword({ email: 'test@example.com' });

      usersService.findByEmail.mockResolvedValue(null);
      const resultB = await service.forgotPassword({ email: 'nobody@example.com' });

      expect(resultA.message).toBe(resultB.message);
    });
  });

  // ---------------------------------------------------------------------------
  // resetPassword()
  // ---------------------------------------------------------------------------
  describe('resetPassword()', () => {
    const rawToken = 'valid-reset-token';
    const newPassword = 'newpassword123';

    it('hashes the new password and clears the reset token on success', async () => {
      const user = makeUser({
        resetToken: hashToken(rawToken),
        resetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
      });
      usersService.findByResetToken.mockResolvedValue(user);
      usersService.updatePassword.mockResolvedValue(undefined);

      const result = await service.resetPassword({ token: rawToken, password: newPassword });

      expect(usersService.updatePassword).toHaveBeenCalledTimes(1);
      const [, storedHash] = usersService.updatePassword.mock.calls[0];
      const isHashed = await bcrypt.compare(newPassword, storedHash);
      expect(isHashed).toBe(true);
      expect(result).toEqual({ message: expect.any(String) });
    });

    it('looks up the SHA256 hash of the token, not the raw token', async () => {
      const user = makeUser({
        resetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
      });
      usersService.findByResetToken.mockResolvedValue(user);
      usersService.updatePassword.mockResolvedValue(undefined);

      await service.resetPassword({ token: rawToken, password: newPassword });

      expect(usersService.findByResetToken).toHaveBeenCalledWith(hashToken(rawToken));
      expect(usersService.findByResetToken).not.toHaveBeenCalledWith(rawToken);
    });

    it('throws BadRequestException for an unknown token', async () => {
      usersService.findByResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bad-token', password: newPassword }),
      ).rejects.toThrow(BadRequestException);

      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the token is expired', async () => {
      const user = makeUser({
        resetToken: hashToken(rawToken),
        resetTokenExpiry: new Date(Date.now() - 1000), // 1 second ago
      });
      usersService.findByResetToken.mockResolvedValue(user);

      await expect(
        service.resetPassword({ token: rawToken, password: newPassword }),
      ).rejects.toThrow(BadRequestException);

      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when resetTokenExpiry is null', async () => {
      const user = makeUser({ resetToken: hashToken(rawToken), resetTokenExpiry: null });
      usersService.findByResetToken.mockResolvedValue(user);

      await expect(
        service.resetPassword({ token: rawToken, password: newPassword }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
