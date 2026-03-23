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

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(email: string, hashedPassword: string, verificationToken: string): Promise<User> {
    const user = this.usersRepository.create({ email, password: hashedPassword, verificationToken, isVerified: false });
    return this.usersRepository.save(user);
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { verificationToken: token } });
  }

  async verifyUser(id: string): Promise<void> {
    await this.usersRepository.update(id, { isVerified: true, verificationToken: null });
  }

  async setVerificationToken(id: string, token: string): Promise<void> {
    await this.usersRepository.update(id, { verificationToken: token });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { resetToken: token } });
  }

  async setResetToken(id: string, token: string, expiry: Date): Promise<void> {
    await this.usersRepository.update(id, { resetToken: token, resetTokenExpiry: expiry });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });
  }
}
