/**
 * users.service.ts — Low-level user persistence service.
 *
 * Provides thin repository wrappers used by AuthService and AdminService.
 * Does not contain business logic — callers are responsible for hashing
 * passwords and generating tokens before passing them in.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Looks up a user by their email address.
   * @param email - The email to search for (case-sensitive match).
   * @returns The User record, or null if not found.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * Looks up a user by their UUID primary key.
   * @param id - The user's UUID.
   * @returns The User record, or null if not found.
   */
  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /**
   * Creates and persists a new unverified user account.
   * @param email             - The user's email address.
   * @param hashedPassword    - A bcrypt hash of the user's chosen password.
   * @param verificationToken - A SHA-256 hash of the raw verification token (stored, never the raw value).
   * @returns The newly created User record.
   */
  async create(email: string, hashedPassword: string, verificationToken: string): Promise<User> {
    const user = this.usersRepository.create({ email, password: hashedPassword, verificationToken, isVerified: false });
    return this.usersRepository.save(user);
  }

  /**
   * Looks up a user by their stored (hashed) email verification token.
   * @param token - The hashed verification token to search for.
   * @returns The matching User, or null.
   */
  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { verificationToken: token } });
  }

  /**
   * Marks a user's email as verified and clears their verification token.
   * @param id - The UUID of the user to verify.
   */
  async verifyUser(id: string): Promise<void> {
    await this.usersRepository.update(id, { isVerified: true, verificationToken: null });
  }

  /**
   * Replaces a user's verification token (e.g. when resending the verification email).
   * @param id    - The UUID of the user.
   * @param token - The new hashed token to store.
   */
  async setVerificationToken(id: string, token: string): Promise<void> {
    await this.usersRepository.update(id, { verificationToken: token });
  }

  /**
   * Looks up a user by their stored (hashed) password reset token.
   * @param token - The hashed reset token to search for.
   * @returns The matching User (including resetTokenExpiry for expiry check), or null.
   */
  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { resetToken: token } });
  }

  /**
   * Stores a hashed password reset token and its expiry timestamp on the user record.
   * @param id     - The UUID of the user.
   * @param token  - The hashed token to store.
   * @param expiry - The timestamp after which the token is no longer valid.
   */
  async setResetToken(id: string, token: string, expiry: Date): Promise<void> {
    await this.usersRepository.update(id, { resetToken: token, resetTokenExpiry: expiry });
  }

  /**
   * Updates the user's password hash and clears the reset token and expiry.
   * @param id             - The UUID of the user.
   * @param hashedPassword - The new bcrypt-hashed password.
   */
  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });
  }

  /**
   * Permanently deletes a user record. Cascades to their job applications via the
   * ON DELETE CASCADE constraint on the jobs.userId foreign key.
   * @param id - The UUID of the user to delete.
   */
  async deleteById(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
