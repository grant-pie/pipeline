import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, verificationToken, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Job) private readonly jobsRepo: Repository<Job>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats() {
    const [totalUsers, verifiedUsers, suspendedUsers, adminUsers, totalJobs] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: { isVerified: true } }),
      this.usersRepo.count({ where: { isSuspended: true } }),
      this.usersRepo.count({ where: { role: UserRole.ADMIN } }),
      this.jobsRepo.count(),
    ]);

    const jobsByStatus = await this.jobsRepo
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.status')
      .getRawMany<{ status: string; count: string }>();

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        suspended: suspendedUsers,
        admins: adminUsers,
      },
      jobs: {
        total: totalJobs,
        byStatus: jobsByStatus.reduce<Record<string, number>>(
          (acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }),
          {},
        ),
      },
    };
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async listUsers(page: number, limit: number, search?: string) {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .loadRelationCountAndMap('user.jobCount', 'user.jobs')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.where('user.email ILIKE :search', { search: `%${search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data: data.map(sanitizeUser), total, hasMore: page * limit < total };
  }

  async getUser(id: string) {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .loadRelationCountAndMap('user.jobCount', 'user.jobs')
      .loadRelationCountAndMap('user.appliedCount', 'user.jobs', 'j_a', (qb) =>
        qb.where('j_a.status = :s', { s: 'applied' }),
      )
      .loadRelationCountAndMap('user.interviewingCount', 'user.jobs', 'j_i', (qb) =>
        qb.where('j_i.status = :s', { s: 'interviewing' }),
      )
      .loadRelationCountAndMap('user.offeredCount', 'user.jobs', 'j_o', (qb) =>
        qb.where('j_o.status = :s', { s: 'offered' }),
      )
      .loadRelationCountAndMap('user.rejectedCount', 'user.jobs', 'j_r', (qb) =>
        qb.where('j_r.status = :s', { s: 'rejected' }),
      )
      .where('user.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException('User not found');
    return sanitizeUser(user);
  }

  async setRole(adminId: string, targetId: string, role: UserRole) {
    if (adminId === targetId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admins cannot demote themselves');
    }
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.update(targetId, { role });
    return { message: `User role updated to ${role}` };
  }

  async suspendUser(adminId: string, targetId: string) {
    if (adminId === targetId) {
      throw new ForbiddenException('Admins cannot suspend themselves');
    }
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.update(targetId, { isSuspended: true });
    return { message: 'User suspended' };
  }

  async unsuspendUser(targetId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.update(targetId, { isSuspended: false });
    return { message: 'User unsuspended' };
  }

  async deleteUser(adminId: string, targetId: string) {
    if (adminId === targetId) {
      throw new ForbiddenException('Admins cannot delete themselves');
    }
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    await this.usersService.deleteById(targetId);
    return { message: 'User deleted' };
  }

  async forceVerifyUser(targetId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    await this.usersService.verifyUser(targetId);
    return { message: 'User verified' };
  }

  async resendVerification(targetId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('User is already verified');
    const token = crypto.randomBytes(32).toString('hex');
    await this.usersService.setVerificationToken(targetId, hashToken(token));
    await this.mailService.sendVerificationEmail(user.email, token);
    return { message: 'Verification email sent' };
  }

  async triggerPasswordReset(targetId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await this.usersService.setResetToken(targetId, hashToken(token), expiry);
    await this.mailService.sendPasswordReset(user.email, token);
    return { message: 'Password reset email sent' };
  }

  // ─── Jobs ─────────────────────────────────────────────────────────────────

  async listJobs(page: number, limit: number, search?: string, userId?: string) {
    const qb = this.jobsRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.user', 'user')
      .orderBy('job.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userId) qb.andWhere('job.userId = :userId', { userId });
    if (search) {
      qb.andWhere('(job.company ILIKE :search OR job.title ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data: data.map((j) => ({
        ...j,
        user: j.user ? { id: j.user.id, email: j.user.email } : null,
      })),
      total,
      hasMore: page * limit < total,
    };
  }

  async getJob(id: string) {
    const job = await this.jobsRepo.findOne({ where: { id }, relations: ['user'] });
    if (!job) throw new NotFoundException('Job not found');
    return {
      ...job,
      user: job.user ? { id: job.user.id, email: job.user.email } : null,
    };
  }

  async updateJob(id: string, dto: Partial<Record<string, unknown>>) {
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    Object.assign(job, dto);
    return this.jobsRepo.save(job);
  }

  async deleteJob(id: string) {
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    await this.jobsRepo.remove(job);
  }

  async bulkDeleteJobs(ids: string[]) {
    if (!ids?.length) throw new BadRequestException('No job IDs provided');
    await this.jobsRepo.delete({ id: In(ids) });
    return { message: `${ids.length} job(s) deleted` };
  }
}
