import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
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

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await this.usersService.create(
      dto.email,
      hashedPassword,
      hashToken(verificationToken),
    );
    await this.mailService.sendVerificationEmail(user.email, verificationToken);

    return { message: 'Account created. Please check your email to verify your account.' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new ForbiddenException('Please verify your email before signing in.');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      accessToken: token,
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(hashToken(token));
    if (!user) {
      throw new BadRequestException('Invalid or expired verification link.');
    }
    await this.usersService.verifyUser(user.id);
    return { message: 'Email verified. You can now sign in.' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && !user.isVerified) {
      const token = crypto.randomBytes(32).toString('hex');
      await this.usersService.setVerificationToken(user.id, hashToken(token));
      await this.mailService.sendVerificationEmail(user.email, token);
    }
    return { message: 'If that email is registered and unverified, a new link has been sent.' };
  }

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
