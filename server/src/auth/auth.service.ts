/**
 * auth.service.ts — Authentication business logic service.
 *
 * Handles the full auth lifecycle: registration (hashes password, sends
 * verification email, stores hashed token), login (bcrypt compare, suspended/
 * unverified checks, JWT sign), email verification, resend, forgot-password,
 * and password reset.
 *
 * Tokens (verification and reset) are generated as 32-byte random hex strings,
 * stored as SHA-256 hashes, and sent raw in email links. This means the DB
 * never holds the value that could be used directly to authenticate.
 */
import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

/**
 * Returns the SHA-256 hex digest of a token string.
 * Used to derive the stored value from the raw token sent in emails.
 *
 * @param token - The raw token string to hash.
 * @returns Hex-encoded SHA-256 digest.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Registers a new user account. Sends a verification email before saving the
   * user so that a mail failure prevents account creation (avoids unverifiable
   * accounts in the DB).
   *
   * @param dto - Validated registration payload (email, password).
   * @returns A success message instructing the user to check their email.
   * @throws ConflictException if the email is already registered.
   * @throws InternalServerErrorException if the verification email cannot be sent.
   */
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    try {
      await this.mailService.sendVerificationEmail(dto.email, verificationToken);
    } catch (err) {
      this.logger.error(
        `Failed to send verification email to ${dto.email}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again.',
      );
    }

    await this.usersService.create(
      dto.email,
      hashedPassword,
      hashToken(verificationToken),
    );

    this.logger.log(`Account created for ${dto.email}`);
    return { message: 'Account created. Please check your email to verify your account.' };
  }

  /**
   * Validates credentials and returns a signed JWT along with the user profile.
   *
   * @param dto - Validated login payload (email, password).
   * @returns An object containing accessToken and a safe user profile.
   * @throws UnauthorizedException for unknown email or wrong password.
   * @throws ForbiddenException if the account is suspended or unverified.
   */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isSuspended) {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    if (!user.isVerified) {
      throw new ForbiddenException('Please verify your email before signing in.');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });

    return {
      accessToken: token,
      user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
    };
  }

  /**
   * Marks a user's email as verified using the raw token from their confirmation link.
   *
   * @param token - The raw verification token from the URL query parameter.
   * @returns A success message on valid token.
   * @throws BadRequestException if the token is invalid or not found.
   */
  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(hashToken(token));
    if (!user) {
      throw new BadRequestException('Invalid or expired verification link.');
    }
    await this.usersService.verifyUser(user.id);
    return { message: 'Email verified. You can now sign in.' };
  }

  /**
   * Re-sends a verification email. Silently does nothing if the email is
   * unknown or already verified — the response is always the same to prevent
   * user enumeration.
   *
   * @param email - The address to re-send the link to.
   * @returns A generic confirmation message.
   */
  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && !user.isVerified) {
      const token = crypto.randomBytes(32).toString('hex');
      await this.usersService.setVerificationToken(user.id, hashToken(token));
      await this.mailService.sendVerificationEmail(user.email, token);
    }
    return { message: 'If that email is registered and unverified, a new link has been sent.' };
  }

  /**
   * Initiates the password reset flow. Sends a reset link with a 1-hour expiry.
   * Always returns the same response regardless of whether the email exists, to
   * prevent user enumeration.
   *
   * @param dto - Validated forgot-password payload (email).
   * @returns A generic confirmation message.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // Always return the same response to prevent email enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await this.usersService.setResetToken(user.id, hashToken(token), expiry);
      await this.mailService.sendPasswordReset(user.email, token);
    }

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  /**
   * Completes the password reset. Validates the token and its expiry, hashes
   * the new password, saves it, and clears the reset token fields.
   *
   * @param dto - Validated reset-password payload (token, new password).
   * @returns A success message on valid, unexpired token.
   * @throws BadRequestException if the token is invalid or expired.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(hashToken(dto.token));

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.usersService.updatePassword(user.id, hashedPassword);

    return { message: 'Password updated successfully.' };
  }
}
