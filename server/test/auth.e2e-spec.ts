import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { UsersService } from '../src/users/users.service';
import { MailService } from '../src/mail/mail.service';
import { User } from '../src/users/entities/user.entity';

const TEST_JWT_SECRET = 'test-jwt-secret-must-be-at-least-32-chars!!';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    email: 'test@example.com',
    password: 'hashed',
    isVerified: true,
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date('2024-01-01'),
    jobs: [],
    ...overrides,
  } as User;
}

describe('Auth endpoints (e2e)', () => {
  let app: INestApplication;
  let usersService: jest.Mocked<UsersService>;
  let mailService: jest.Mocked<MailService>;
  let hashedPassword: string;

  beforeAll(async () => {
    // Hash once — bcrypt is slow, no need to repeat per test
    hashedPassword = await bcrypt.hash('password123', 10);
  });

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findByVerificationToken: jest.fn(),
      verifyUser: jest.fn(),
      setVerificationToken: jest.fn(),
      findByResetToken: jest.fn(),
      setResetToken: jest.fn(),
      updatePassword: jest.fn(),
    };

    const mockMailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: TEST_JWT_SECRET,
          JWT_EXPIRES_IN: '1h',
        };
        return config[key] ?? defaultVal;
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    usersService = mockUsersService as unknown as jest.Mocked<UsersService>;
    mailService = mockMailService as unknown as jest.Mocked<MailService>;
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // POST /auth/register
  // ---------------------------------------------------------------------------
  describe('POST /auth/register', () => {
    it('returns 201 and a success message with a valid body', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(makeUser({ email: 'new@example.com' }));

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBeDefined();
    });

    it('returns 400 when email is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'user@example.com', password: 'short' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 409 when the email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(409);
    });

    it('strips unknown fields from the request body (whitelist: true)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(makeUser());

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'password123', isAdmin: true });

      // UsersService.create is called with (email, hash, token) — no isAdmin
      expect(usersService.create.mock.calls[0]).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/login
  // ---------------------------------------------------------------------------
  describe('POST /auth/login', () => {
    it('returns 200 with accessToken and user data for a valid verified user', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: true });
      usersService.findByEmail.mockResolvedValue(user);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.email).toBe(user.email);
    });

    it('does not expose the password field in the response', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: true });
      usersService.findByEmail.mockResolvedValue(user);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'password123' });

      expect(res.body.password).toBeUndefined();
      expect(res.body.user?.password).toBeUndefined();
    });

    it('returns 401 for a wrong password', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: true });
      usersService.findByEmail.mockResolvedValue(user);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('returns the same error message for wrong password and unknown email (no enumeration)', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: true });

      usersService.findByEmail.mockResolvedValue(user);
      const resA = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrongpassword' });

      usersService.findByEmail.mockResolvedValue(null);
      const resB = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(resA.body.message).toBe(resB.body.message);
    });

    it('returns 403 when the user exists but is not verified', async () => {
      const user = makeUser({ password: hashedPassword, isVerified: false });
      usersService.findByEmail.mockResolvedValue(user);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'password123' });

      expect(res.status).toBe(403);
    });

    it('returns 400 for an invalid body', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bad', password: '' });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /auth/verify-email
  // ---------------------------------------------------------------------------
  describe('GET /auth/verify-email', () => {
    it('returns 200 for a valid token', async () => {
      usersService.findByVerificationToken.mockResolvedValue(makeUser({ isVerified: false }));
      usersService.verifyUser.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: 'valid-raw-token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('returns 400 for an unknown token', async () => {
      usersService.findByVerificationToken.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: 'bad-token' });

      expect(res.status).toBe(400);
    });

    it('calls verifyUser after finding a valid token', async () => {
      const user = makeUser({ isVerified: false });
      usersService.findByVerificationToken.mockResolvedValue(user);
      usersService.verifyUser.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: 'valid-token' });

      expect(usersService.verifyUser).toHaveBeenCalledWith(user.id);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/resend-verification
  // ---------------------------------------------------------------------------
  describe('POST /auth/resend-verification', () => {
    it('returns 201 for an existing unverified user', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser({ isVerified: false }));
      usersService.setVerificationToken.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBeDefined();
    });

    it('returns 201 with the same message for an unknown email (no enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const resA = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'nobody@example.com' });

      usersService.findByEmail.mockResolvedValue(makeUser({ isVerified: false }));
      usersService.setVerificationToken.mockResolvedValue(undefined);

      const resB = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'test@example.com' });

      expect(resA.status).toBe(201);
      expect(resA.body.message).toBe(resB.body.message);
    });

    it('returns 400 for an invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/forgot-password
  // ---------------------------------------------------------------------------
  describe('POST /auth/forgot-password', () => {
    it('returns 201 for an existing email', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());
      usersService.setResetToken.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBeDefined();
    });

    it('returns 201 with the same message for an unknown email (no enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const resA = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nobody@example.com' });

      usersService.findByEmail.mockResolvedValue(makeUser());
      usersService.setResetToken.mockResolvedValue(undefined);

      const resB = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(resA.status).toBe(201);
      expect(resA.body.message).toBe(resB.body.message);
    });

    it('returns 400 for an invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'bad' });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/reset-password
  // ---------------------------------------------------------------------------
  describe('POST /auth/reset-password', () => {
    it('returns 201 for a valid token and password', async () => {
      usersService.findByResetToken.mockResolvedValue(
        makeUser({ resetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000) }),
      );
      usersService.updatePassword.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-token', password: 'newpassword123' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBeDefined();
    });

    it('returns 400 for an invalid or unknown token', async () => {
      usersService.findByResetToken.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'bad-token', password: 'newpassword123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for an expired token', async () => {
      usersService.findByResetToken.mockResolvedValue(
        makeUser({ resetTokenExpiry: new Date(Date.now() - 1000) }),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'expired-token', password: 'newpassword123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when the new password is too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'some-token', password: 'short' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when token is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ password: 'newpassword123' });

      expect(res.status).toBe(400);
    });
  });
});
