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
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.entity';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, verificationToken, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

export interface AdminActor {
  id: string;
  email: string;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Job) private readonly jobsRepo: Repository<Job>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
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

  async listUsers(
    page: number,
    limit: number,
    search?: string,
    sortBy = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const SORTABLE = new Set(['email', 'role', 'isSuspended', 'isVerified', 'createdAt']);
    const sortCol = SORTABLE.has(sortBy) ? `user.${sortBy}` : 'user.createdAt';

    const qb = this.usersRepo
      .createQueryBuilder('user')
      .loadRelationCountAndMap('user.jobCount', 'user.jobs')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.where('(user.email ILIKE :search OR CAST(user.id AS text) ILIKE :search)', { search: `%${search}%` });
    }

    // jobCount is a mapped relation count — sort in memory when requested
    if (sortBy === 'jobCount') {
      qb.orderBy('user.createdAt', 'DESC');
      const [data, total] = await qb.getManyAndCount();
      const sorted = data.sort((a, b) => {
        const aCount = (a as any).jobCount ?? 0;
        const bCount = (b as any).jobCount ?? 0;
        return sortOrder === 'ASC' ? aCount - bCount : bCount - aCount;
      });
      return { data: sorted.map(sanitizeUser), total, hasMore: page * limit < total };
    }

    qb.orderBy(sortCol, sortOrder);
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

  async setRole(actor: AdminActor, targetId: string, role: UserRole) {
    if (actor.id === targetId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admins cannot demote themselves');
    }
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    await this.usersRepo.update(targetId, { role });

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.SET_ROLE,
      targetType: 'user',
      targetId,
      metadata: { targetEmail: user.email, fromRole: user.role, toRole: role },
    });

    return { message: `User role updated to ${role}` };
  }

  async suspendUser(actor: AdminActor, targetId: string) {
    if (actor.id === targetId) {
      throw new ForbiddenException('Admins cannot suspend themselves');
    }
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    await this.usersRepo.update(targetId, { isSuspended: true });

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.SUSPEND_USER,
      targetType: 'user',
      targetId,
      metadata: { targetEmail: user.email },
    });

    return { message: 'User suspended' };
  }

  async unsuspendUser(actor: AdminActor, targetId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    await this.usersRepo.update(targetId, { isSuspended: false });

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.UNSUSPEND_USER,
      targetType: 'user',
      targetId,
      metadata: { targetEmail: user.email },
    });

    return { message: 'User unsuspended' };
  }

  async deleteUser(actor: AdminActor, targetId: string) {
    if (actor.id === targetId) {
      throw new ForbiddenException('Admins cannot delete themselves');
    }
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    await this.usersService.deleteById(targetId);

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.DELETE_USER,
      targetType: 'user',
      targetId,
      metadata: { targetEmail: user.email },
    });

    return { message: 'User deleted' };
  }

  async forceVerifyUser(actor: AdminActor, targetId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    await this.usersService.verifyUser(targetId);

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.FORCE_VERIFY,
      targetType: 'user',
      targetId,
      metadata: { targetEmail: user.email },
    });

    return { message: 'User verified' };
  }

  async resendVerification(actor: AdminActor, targetId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('User is already verified');

    const token = crypto.randomBytes(32).toString('hex');
    await this.usersService.setVerificationToken(targetId, hashToken(token));
    await this.mailService.sendVerificationEmail(user.email, token);

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.RESEND_VERIFICATION,
      targetType: 'user',
      targetId,
      metadata: { targetEmail: user.email },
    });

    return { message: 'Verification email sent' };
  }

  async triggerPasswordReset(actor: AdminActor, targetId: string) {
    const user = await this.usersService.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await this.usersService.setResetToken(targetId, hashToken(token), expiry);
    await this.mailService.sendPasswordReset(user.email, token);

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.TRIGGER_PASSWORD_RESET,
      targetType: 'user',
      targetId,
      metadata: { targetEmail: user.email },
    });

    return { message: 'Password reset email sent' };
  }

  // ─── Jobs ─────────────────────────────────────────────────────────────────

  async listJobs(
    page: number,
    limit: number,
    search?: string,
    userId?: string,
    sortBy = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const SORTABLE = new Set(['company', 'title', 'status', 'dateApplied', 'createdAt']);
    const sortCol = SORTABLE.has(sortBy) ? `job.${sortBy}` : 'job.createdAt';

    const qb = this.jobsRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.user', 'user')
      .orderBy(sortCol, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    if (userId) qb.andWhere('job.userId = :userId', { userId });
    if (search) {
      qb.andWhere(
        '(job.company ILIKE :search OR job.title ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
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

  async updateJob(actor: AdminActor, id: string, dto: Partial<Record<string, unknown>>) {
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    Object.assign(job, dto);
    const saved = await this.jobsRepo.save(job);

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.UPDATE_JOB,
      targetType: 'job',
      targetId: id,
      metadata: { company: job.company, title: job.title, userId: job.userId, fields: Object.keys(dto) },
    });

    return saved;
  }

  async deleteJob(actor: AdminActor, id: string) {
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    await this.jobsRepo.remove(job);

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.DELETE_JOB,
      targetType: 'job',
      targetId: id,
      metadata: { company: job.company, title: job.title, userId: job.userId },
    });
  }

  async bulkDeleteJobs(actor: AdminActor, ids: string[]) {
    if (!ids?.length) throw new BadRequestException('No job IDs provided');

    await this.jobsRepo.delete({ id: In(ids) });

    this.auditLogService.log({
      adminId: actor.id,
      adminEmail: actor.email,
      action: AuditAction.BULK_DELETE_JOBS,
      targetType: 'job',
      metadata: { count: ids.length, ids },
    });

    return { message: `${ids.length} job(s) deleted` };
  }

  // ─── Charts ───────────────────────────────────────────────────────────────

  async getCharts() {
    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const [baselineResult, userMonthlyRaw, jobActivityRaw, topCompaniesRaw] = await Promise.all([
      this.usersRepo.query<{ count: string }[]>(
        `SELECT COUNT(*)::int as count FROM users WHERE "createdAt" < $1`,
        [start],
      ),
      this.usersRepo.query<{ month: string; count: number }[]>(
        `SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month, COUNT(*)::int as count
         FROM users WHERE "createdAt" >= $1
         GROUP BY DATE_TRUNC('month', "createdAt")
         ORDER BY DATE_TRUNC('month', "createdAt")`,
        [start],
      ),
      this.jobsRepo.query<{ month: string; status: string; count: number }[]>(
        `SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month, status, COUNT(*)::int as count
         FROM jobs WHERE "createdAt" >= $1
         GROUP BY DATE_TRUNC('month', "createdAt"), status
         ORDER BY DATE_TRUNC('month', "createdAt")`,
        [start],
      ),
      this.jobsRepo.query<{ company: string; count: number }[]>(
        `SELECT company, COUNT(*)::int as count FROM jobs GROUP BY company ORDER BY count DESC LIMIT 10`,
      ),
    ]);

    const userMonthMap = new Map(userMonthlyRaw.map(r => [r.month, r.count]));
    let cumulative = Number(baselineResult[0].count);
    const userGrowthData = months.map(m => {
      cumulative += (userMonthMap.get(m) ?? 0);
      return cumulative;
    });

    const jobMonthStatusMap = new Map<string, Map<string, number>>();
    for (const row of jobActivityRaw) {
      if (!jobMonthStatusMap.has(row.month)) jobMonthStatusMap.set(row.month, new Map());
      jobMonthStatusMap.get(row.month)!.set(row.status, row.count);
    }
    const statuses = ['applied', 'interviewing', 'offered', 'rejected'] as const;
    const jobActivityDatasets = Object.fromEntries(
      statuses.map(status => [status, months.map(m => jobMonthStatusMap.get(m)?.get(status) ?? 0)]),
    );

    return {
      userGrowth: { labels: months, data: userGrowthData },
      jobActivity: { labels: months, datasets: jobActivityDatasets },
      topCompanies: {
        labels: topCompaniesRaw.map(r => r.company),
        data: topCompaniesRaw.map(r => r.count),
      },
    };
  }

  // ─── Audit Log ────────────────────────────────────────────────────────────

  getAuditLog(page: number, limit: number, search?: string, sortBy?: string, sortOrder?: 'ASC' | 'DESC') {
    return this.auditLogService.findAll(page, limit, search, sortBy, sortOrder);
  }
}
