/**
 * admin.service.ts — Admin business logic service.
 *
 * Implements all admin operations grouped into four areas:
 *
 *   Stats    — aggregate user and job counts for the dashboard overview.
 *   Users    — paginated list, single fetch, role change, suspend/unsuspend,
 *              delete, force-verify, resend-verification, trigger-password-reset.
 *   Jobs     — paginated list (all users), single fetch, update, delete,
 *              bulk delete.
 *   Charts   — 12-month rolling time-series data for the three dashboard graphs.
 *
 * Every mutating operation accepts an AdminActor (id + email of the acting admin),
 * applies a self-action guard where appropriate, and records the action in the
 * audit log via AuditLogService.log().
 */
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
import { UpdateJobDto } from '../jobs/dto/update-job.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.entity';

/**
 * Returns the SHA-256 hex digest of a token string (mirrors the auth service utility).
 * @param token - The raw token to hash.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Strips sensitive fields from a User record before it is sent to the client.
 * Removes password hash, verification token, reset token, and reset token expiry.
 *
 * @param user - The full User entity from the database.
 * @returns A safe copy of the user without credential fields.
 */
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

  /**
   * Returns aggregate user and job statistics for the admin dashboard overview.
   * Runs five COUNT queries and one grouped aggregate in parallel via Promise.all.
   *
   * @returns AdminStats with user totals and per-status job counts.
   */
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

  /**
   * Returns a paginated list of all users with their job counts.
   * jobCount sorting is handled in-memory because TypeORM mapped relation counts
   * cannot be ordered at the database level.
   *
   * @param page      - 1-based page number.
   * @param limit     - Records per page.
   * @param search    - Optional ILIKE filter on email or user ID.
   * @param sortBy    - Column to order by (whitelisted set; jobCount is in-memory).
   * @param sortOrder - 'ASC' or 'DESC'.
   * @returns Paginated sanitized user records.
   */
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

  /**
   * Returns a single user with per-status job counts (applied, interviewing, offered, rejected).
   *
   * @param id - UUID of the user.
   * @returns Sanitized user record with job count breakdowns.
   * @throws NotFoundException if no user with the given ID exists.
   */
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

  /**
   * Changes a user's role. Admins cannot demote themselves.
   *
   * @param actor    - The admin performing the action.
   * @param targetId - UUID of the user whose role is being changed.
   * @param role     - The new role to assign.
   * @throws ForbiddenException if the admin tries to demote themselves.
   * @throws NotFoundException if the target user does not exist.
   */
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

  /**
   * Suspends a user account, preventing login. Admins cannot suspend themselves.
   *
   * @param actor    - The admin performing the action.
   * @param targetId - UUID of the user to suspend.
   * @throws ForbiddenException if the admin targets themselves.
   * @throws NotFoundException if the target user does not exist.
   */
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

  /**
   * Lifts the suspension on a user account, restoring login access.
   *
   * @param actor    - The admin performing the action.
   * @param targetId - UUID of the user to unsuspend.
   * @throws NotFoundException if the target user does not exist.
   */
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

  /**
   * Permanently deletes a user and all their job applications (via CASCADE).
   * Admins cannot delete themselves.
   *
   * @param actor    - The admin performing the action.
   * @param targetId - UUID of the user to delete.
   * @throws ForbiddenException if the admin targets themselves.
   * @throws NotFoundException if the target user does not exist.
   */
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

  /**
   * Marks a user's email as verified without requiring them to click an email link.
   *
   * @param actor    - The admin performing the action.
   * @param targetId - UUID of the user to force-verify.
   * @throws NotFoundException if the target user does not exist.
   */
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

  /**
   * Generates a new verification token and sends a fresh verification email.
   *
   * @param actor    - The admin performing the action.
   * @param targetId - UUID of the user to re-send the email to.
   * @throws NotFoundException if the target user does not exist.
   * @throws BadRequestException if the user is already verified.
   */
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

  /**
   * Generates a password reset token (1-hour expiry) and sends a reset email on
   * behalf of the admin.
   *
   * @param actor    - The admin performing the action.
   * @param targetId - UUID of the user to send the reset email to.
   * @throws NotFoundException if the target user does not exist.
   */
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

  /**
   * Returns a paginated list of all job applications across all users.
   * Each record includes a trimmed user object (id + email only).
   *
   * @param page      - 1-based page number.
   * @param limit     - Records per page.
   * @param search    - Optional ILIKE filter on company, title, or owner email.
   * @param userId    - Optional filter to restrict results to a single user's jobs.
   * @param sortBy    - Column to order by (whitelisted set).
   * @param sortOrder - 'ASC' or 'DESC'.
   * @returns Paginated job records with trimmed user info.
   */
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

  /**
   * Fetches a single job application including its owner's id and email.
   *
   * @param id - UUID of the job.
   * @returns The job record with a trimmed user object (or null if user was deleted).
   * @throws NotFoundException if no job with the given ID exists.
   */
  async getJob(id: string) {
    const job = await this.jobsRepo.findOne({ where: { id }, relations: ['user'] });
    if (!job) throw new NotFoundException('Job not found');
    return {
      ...job,
      user: job.user ? { id: job.user.id, email: job.user.email } : null,
    };
  }

  /**
   * Updates any writable fields on a job application and records the change.
   * Only fields explicitly present in dto are applied; undefined fields are ignored.
   *
   * @param actor - The admin performing the action.
   * @param id    - UUID of the job to update.
   * @param dto   - Partial UpdateJobDto with the fields to change.
   * @returns The saved Job record.
   * @throws NotFoundException if the job does not exist.
   */
  async updateJob(actor: AdminActor, id: string, dto: UpdateJobDto) {
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    const { company, title, status, dateApplied, notes, link } = dto;
    if (company !== undefined) job.company = company;
    if (title !== undefined) job.title = title;
    if (status !== undefined) job.status = status;
    if (dateApplied !== undefined) job.dateApplied = dateApplied;
    if (notes !== undefined) job.notes = notes;
    if (link !== undefined) job.link = link;

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

  /**
   * Permanently deletes a single job application.
   *
   * @param actor - The admin performing the action.
   * @param id    - UUID of the job to delete.
   * @throws NotFoundException if the job does not exist.
   */
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

  /**
   * Permanently deletes multiple job applications in a single DELETE WHERE IN query.
   *
   * @param actor - The admin performing the action.
   * @param ids   - Array of job UUIDs to delete.
   * @returns A confirmation message with the count of deleted records.
   * @throws BadRequestException if the ids array is empty.
   */
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

  /**
   * Builds the chart datasets for the admin dashboard.
   * Covers the rolling 12-month window ending this month.
   *
   *   userGrowth    — Cumulative user count per month (baseline + monthly deltas).
   *   jobActivity   — New job applications per month broken down by status.
   *   topCompanies  — Top 10 companies by total application count.
   *
   * @returns AdminCharts with labelled datasets ready for Chart.js.
   */
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

  /**
   * Delegates to AuditLogService.findAll — thin pass-through kept here so the
   * controller only needs to depend on AdminService.
   *
   * @param page      - 1-based page number.
   * @param limit     - Records per page.
   * @param search    - Optional text filter.
   * @param sortBy    - Column to order by.
   * @param sortOrder - 'ASC' or 'DESC'.
   */
  getAuditLog(page: number, limit: number, search?: string, sortBy?: string, sortOrder?: 'ASC' | 'DESC') {
    return this.auditLogService.findAll(page, limit, search, sortBy, sortOrder);
  }
}
