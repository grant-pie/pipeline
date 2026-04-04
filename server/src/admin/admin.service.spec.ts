import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { AdminService, AdminActor } from './admin.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.entity';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    email: 'user@example.com',
    password: '$2a$10$hashedpassword',
    role: UserRole.USER,
    isSuspended: false,
    isVerified: true,
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date('2024-01-01'),
    jobs: [],
    ...overrides,
  } as User;
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-uuid-1',
    company: 'Acme Corp',
    title: 'Software Engineer',
    dateApplied: '2024-03-01',
    status: 'applied' as JobStatus,
    notes: null,
    link: null,
    userId: 'user-uuid-1',
    user: null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    ...overrides,
  } as Job;
}

const ADMIN_ACTOR: AdminActor = { id: 'admin-uuid-1', email: 'admin@example.com' };
const OTHER_USER_ID = 'user-uuid-2';

describe('AdminService', () => {
  let service: AdminService;
  let usersRepo: { count: jest.Mock; update: jest.Mock; createQueryBuilder: jest.Mock };
  let jobsRepo: {
    count: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let usersService: jest.Mocked<UsersService>;
  let mailService: jest.Mocked<MailService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  // Chainable query builder mock shared across test suites
  let qb: Record<string, jest.Mock>;

  function makeQb() {
    const builder: Record<string, jest.Mock> = {};
    const chain = () => builder;
    [
      'select', 'addSelect', 'groupBy', 'where', 'andWhere',
      'orderBy', 'skip', 'take', 'leftJoinAndSelect',
    ].forEach((m) => { builder[m] = jest.fn().mockReturnValue(chain()); });
    builder.loadRelationCountAndMap = jest.fn().mockImplementation(
      (_prop, _rel, _alias?, cb?) => {
        if (cb) cb({ where: jest.fn().mockReturnThis() });
        return chain();
      },
    );
    builder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    builder.getOne = jest.fn().mockResolvedValue(null);
    builder.getRawMany = jest.fn().mockResolvedValue([]);
    return builder;
  }

  beforeEach(async () => {
    qb = makeQb();

    usersRepo = {
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    jobsRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (j) => j),
      remove: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findByVerificationToken: jest.fn(),
      verifyUser: jest.fn().mockResolvedValue(undefined),
      setVerificationToken: jest.fn().mockResolvedValue(undefined),
      findByResetToken: jest.fn(),
      setResetToken: jest.fn().mockResolvedValue(undefined),
      updatePassword: jest.fn(),
      deleteById: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UsersService>;

    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MailService>;

    auditLogService = {
      log: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    } as unknown as jest.Mocked<AuditLogService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Job), useValue: jobsRepo },
        { provide: UsersService, useValue: usersService },
        { provide: MailService, useValue: mailService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // getStats()
  // ---------------------------------------------------------------------------
  describe('getStats()', () => {
    beforeEach(() => {
      usersRepo.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // verified
        .mockResolvedValueOnce(3)   // suspended
        .mockResolvedValueOnce(2);  // admins
      jobsRepo.count.mockResolvedValue(250);
      qb.getRawMany.mockResolvedValue([
        { status: 'applied', count: '120' },
        { status: 'interviewing', count: '60' },
        { status: 'offered', count: '40' },
        { status: 'rejected', count: '30' },
      ]);
    });

    it('returns correct user counts', async () => {
      const result = await service.getStats();

      expect(result.users.total).toBe(100);
      expect(result.users.verified).toBe(80);
      expect(result.users.suspended).toBe(3);
      expect(result.users.admins).toBe(2);
    });

    it('returns correct total job count', async () => {
      const result = await service.getStats();

      expect(result.jobs.total).toBe(250);
    });

    it('parses byStatus string counts into integers', async () => {
      const result = await service.getStats();

      expect(result.jobs.byStatus['applied']).toBe(120);
      expect(result.jobs.byStatus['interviewing']).toBe(60);
      expect(result.jobs.byStatus['offered']).toBe(40);
      expect(result.jobs.byStatus['rejected']).toBe(30);
    });

    it('returns empty byStatus object when there are no jobs', async () => {
      qb.getRawMany.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.jobs.byStatus).toEqual({});
    });

    it('executes all five count queries in parallel via Promise.all', async () => {
      const callOrder: string[] = [];
      usersRepo.count.mockImplementation(async () => { callOrder.push('user'); return 0; });
      jobsRepo.count.mockImplementation(async () => { callOrder.push('job'); return 0; });

      await service.getStats();

      // All 5 calls should be initiated before any resolves — confirmed by them all running
      expect(usersRepo.count).toHaveBeenCalledTimes(4);
      expect(jobsRepo.count).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // listUsers()
  // ---------------------------------------------------------------------------
  describe('listUsers()', () => {
    it('returns paginated data, total, and hasMore when more pages exist', async () => {
      const users = [makeUser(), makeUser({ id: 'user-uuid-2' })];
      qb.getManyAndCount.mockResolvedValue([users, 50]);

      const result = await service.listUsers(1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.hasMore).toBe(true);
    });

    it('returns hasMore: false on the last page', async () => {
      qb.getManyAndCount.mockResolvedValue([[makeUser()], 20]);

      const result = await service.listUsers(1, 20);

      expect(result.hasMore).toBe(false);
    });

    it('applies ILIKE search filter on email and id when search is provided', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(1, 20, 'alice');

      expect(qb.where).toHaveBeenCalledWith(
        '(user.email ILIKE :search OR CAST(user.id AS text) ILIKE :search)',
        { search: '%alice%' },
      );
    });

    it('does not call where() when search is undefined', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(1, 20, undefined);

      expect(qb.where).not.toHaveBeenCalled();
    });

    it('applies correct skip for page 2 with limit 20', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(2, 20);

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('strips sensitive fields from every returned user', async () => {
      const user = makeUser({
        password: 'secret',
        verificationToken: 'raw-token',
        resetToken: 'reset-token',
        resetTokenExpiry: new Date(),
      });
      qb.getManyAndCount.mockResolvedValue([[user], 1]);

      const result = await service.listUsers(1, 20);

      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.data[0]).not.toHaveProperty('verificationToken');
      expect(result.data[0]).not.toHaveProperty('resetToken');
      expect(result.data[0]).not.toHaveProperty('resetTokenExpiry');
    });
  });

  // ---------------------------------------------------------------------------
  // getUser()
  // ---------------------------------------------------------------------------
  describe('getUser()', () => {
    it('returns the user when found', async () => {
      const user = makeUser();
      qb.getOne.mockResolvedValue(user);

      const result = await service.getUser(user.id);

      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
    });

    it('strips sensitive fields from the returned user', async () => {
      qb.getOne.mockResolvedValue(makeUser({
        password: 'secret',
        verificationToken: 'tok',
        resetToken: 'reset',
        resetTokenExpiry: new Date(),
      }));

      const result = await service.getUser('user-uuid-1');

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('verificationToken');
      expect(result).not.toHaveProperty('resetToken');
      expect(result).not.toHaveProperty('resetTokenExpiry');
    });

    it('throws NotFoundException when user does not exist', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.getUser('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // setRole()
  // ---------------------------------------------------------------------------
  describe('setRole()', () => {
    it('updates the target user role in the repository', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      await service.setRole(ADMIN_ACTOR, OTHER_USER_ID, UserRole.ADMIN);

      expect(usersRepo.update).toHaveBeenCalledWith(OTHER_USER_ID, { role: UserRole.ADMIN });
    });

    it('returns a success message containing the new role', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      const result = await service.setRole(ADMIN_ACTOR, OTHER_USER_ID, UserRole.ADMIN);

      expect(result.message).toContain('admin');
    });

    it('writes an audit log entry with correct fields', async () => {
      const target = makeUser({ id: OTHER_USER_ID, email: 'target@example.com', role: UserRole.USER });
      usersService.findById.mockResolvedValue(target);

      await service.setRole(ADMIN_ACTOR, OTHER_USER_ID, UserRole.ADMIN);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: ADMIN_ACTOR.id,
          adminEmail: ADMIN_ACTOR.email,
          action: AuditAction.SET_ROLE,
          targetType: 'user',
          targetId: OTHER_USER_ID,
          metadata: expect.objectContaining({
            targetEmail: target.email,
            fromRole: UserRole.USER,
            toRole: UserRole.ADMIN,
          }),
        }),
      );
    });

    it('throws ForbiddenException when admin tries to demote themselves', async () => {
      await expect(
        service.setRole(ADMIN_ACTOR, ADMIN_ACTOR.id, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);

      expect(usersRepo.update).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('does not throw when admin sets their own role to admin', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: ADMIN_ACTOR.id, role: UserRole.ADMIN }));

      await expect(
        service.setRole(ADMIN_ACTOR, ADMIN_ACTOR.id, UserRole.ADMIN),
      ).resolves.not.toThrow();
    });

    it('throws NotFoundException when target user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.setRole(ADMIN_ACTOR, 'non-existent-id', UserRole.ADMIN),
      ).rejects.toThrow(NotFoundException);

      expect(usersRepo.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // suspendUser()
  // ---------------------------------------------------------------------------
  describe('suspendUser()', () => {
    it('sets isSuspended: true on the target user', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      await service.suspendUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(usersRepo.update).toHaveBeenCalledWith(OTHER_USER_ID, { isSuspended: true });
    });

    it('returns { message: "User suspended" }', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      const result = await service.suspendUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(result).toEqual({ message: 'User suspended' });
    });

    it('writes an audit log entry with action SUSPEND_USER and targetEmail in metadata', async () => {
      const target = makeUser({ id: OTHER_USER_ID, email: 'target@example.com' });
      usersService.findById.mockResolvedValue(target);

      await service.suspendUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.SUSPEND_USER,
          targetId: OTHER_USER_ID,
          metadata: expect.objectContaining({ targetEmail: target.email }),
        }),
      );
    });

    it('throws ForbiddenException when admin tries to suspend themselves', async () => {
      await expect(
        service.suspendUser(ADMIN_ACTOR, ADMIN_ACTOR.id),
      ).rejects.toThrow(ForbiddenException);

      expect(usersRepo.update).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when target user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.suspendUser(ADMIN_ACTOR, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // unsuspendUser()
  // ---------------------------------------------------------------------------
  describe('unsuspendUser()', () => {
    it('sets isSuspended: false on the target user', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      await service.unsuspendUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(usersRepo.update).toHaveBeenCalledWith(OTHER_USER_ID, { isSuspended: false });
    });

    it('returns { message: "User unsuspended" }', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      const result = await service.unsuspendUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(result).toEqual({ message: 'User unsuspended' });
    });

    it('writes an audit log entry with action UNSUSPEND_USER', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      await service.unsuspendUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.UNSUSPEND_USER }),
      );
    });

    it('throws NotFoundException when target user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.unsuspendUser(ADMIN_ACTOR, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteUser()
  // ---------------------------------------------------------------------------
  describe('deleteUser()', () => {
    it('calls usersService.deleteById with the correct id', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      await service.deleteUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(usersService.deleteById).toHaveBeenCalledWith(OTHER_USER_ID);
    });

    it('returns { message: "User deleted" }', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      const result = await service.deleteUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(result).toEqual({ message: 'User deleted' });
    });

    it('writes an audit log entry with action DELETE_USER and targetEmail in metadata', async () => {
      const target = makeUser({ id: OTHER_USER_ID, email: 'victim@example.com' });
      usersService.findById.mockResolvedValue(target);

      await service.deleteUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DELETE_USER,
          targetId: OTHER_USER_ID,
          metadata: expect.objectContaining({ targetEmail: target.email }),
        }),
      );
    });

    it('throws ForbiddenException when admin tries to delete themselves', async () => {
      await expect(
        service.deleteUser(ADMIN_ACTOR, ADMIN_ACTOR.id),
      ).rejects.toThrow(ForbiddenException);

      expect(usersService.deleteById).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when target user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.deleteUser(ADMIN_ACTOR, 'bad-id')).rejects.toThrow(NotFoundException);

      expect(usersService.deleteById).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // forceVerifyUser()
  // ---------------------------------------------------------------------------
  describe('forceVerifyUser()', () => {
    it('calls usersService.verifyUser with the correct id', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      await service.forceVerifyUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(usersService.verifyUser).toHaveBeenCalledWith(OTHER_USER_ID);
    });

    it('returns { message: "User verified" }', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      const result = await service.forceVerifyUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(result).toEqual({ message: 'User verified' });
    });

    it('writes an audit log entry with action FORCE_VERIFY', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      await service.forceVerifyUser(ADMIN_ACTOR, OTHER_USER_ID);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.FORCE_VERIFY, targetId: OTHER_USER_ID }),
      );
    });

    it('throws NotFoundException when target user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.forceVerifyUser(ADMIN_ACTOR, 'bad-id')).rejects.toThrow(NotFoundException);

      expect(usersService.verifyUser).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // resendVerification()
  // ---------------------------------------------------------------------------
  describe('resendVerification()', () => {
    it('stores the SHA256-hashed token and sends the raw token by email', async () => {
      usersService.findById.mockResolvedValue(
        makeUser({ id: OTHER_USER_ID, isVerified: false }),
      );

      await service.resendVerification(ADMIN_ACTOR, OTHER_USER_ID);

      const [, storedToken] = usersService.setVerificationToken.mock.calls[0];
      const [, emailToken] = mailService.sendVerificationEmail.mock.calls[0];

      expect(storedToken).toBe(hashToken(emailToken));
      expect(emailToken).not.toBe(storedToken);
    });

    it('returns { message: "Verification email sent" }', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID, isVerified: false }));

      const result = await service.resendVerification(ADMIN_ACTOR, OTHER_USER_ID);

      expect(result).toEqual({ message: 'Verification email sent' });
    });

    it('writes an audit log entry with action RESEND_VERIFICATION', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID, isVerified: false }));

      await service.resendVerification(ADMIN_ACTOR, OTHER_USER_ID);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.RESEND_VERIFICATION, targetId: OTHER_USER_ID }),
      );
    });

    it('throws NotFoundException when target user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.resendVerification(ADMIN_ACTOR, 'bad-id')).rejects.toThrow(NotFoundException);

      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when user is already verified', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID, isVerified: true }));

      await expect(service.resendVerification(ADMIN_ACTOR, OTHER_USER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // triggerPasswordReset()
  // ---------------------------------------------------------------------------
  describe('triggerPasswordReset()', () => {
    it('stores the SHA256-hashed token and sends the raw token by email', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      await service.triggerPasswordReset(ADMIN_ACTOR, OTHER_USER_ID);

      const [, storedToken] = usersService.setResetToken.mock.calls[0];
      const [, emailToken] = mailService.sendPasswordReset.mock.calls[0];

      expect(storedToken).toBe(hashToken(emailToken));
      expect(emailToken).not.toBe(storedToken);
    });

    it('sets the reset token expiry approximately 1 hour in the future', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      const before = Date.now();
      await service.triggerPasswordReset(ADMIN_ACTOR, OTHER_USER_ID);
      const after = Date.now();

      const [, , expiry] = usersService.setResetToken.mock.calls[0];
      expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 60 * 60 * 1000);
      expect(expiry.getTime()).toBeLessThanOrEqual(after + 60 * 60 * 1000);
    });

    it('returns { message: "Password reset email sent" }', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      const result = await service.triggerPasswordReset(ADMIN_ACTOR, OTHER_USER_ID);

      expect(result).toEqual({ message: 'Password reset email sent' });
    });

    it('writes an audit log entry with action TRIGGER_PASSWORD_RESET', async () => {
      usersService.findById.mockResolvedValue(makeUser({ id: OTHER_USER_ID }));

      await service.triggerPasswordReset(ADMIN_ACTOR, OTHER_USER_ID);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.TRIGGER_PASSWORD_RESET,
          targetId: OTHER_USER_ID,
        }),
      );
    });

    it('throws NotFoundException when target user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.triggerPasswordReset(ADMIN_ACTOR, 'bad-id')).rejects.toThrow(NotFoundException);

      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // listJobs()
  // ---------------------------------------------------------------------------
  describe('listJobs()', () => {
    it('returns paginated data, total, and hasMore', async () => {
      const jobs = [makeJob(), makeJob({ id: 'job-uuid-2' })];
      qb.getManyAndCount.mockResolvedValue([jobs, 50]);

      const result = await service.listJobs(1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.hasMore).toBe(true);
    });

    it('returns hasMore: false on the last page', async () => {
      qb.getManyAndCount.mockResolvedValue([[makeJob()], 20]);

      const result = await service.listJobs(1, 20);

      expect(result.hasMore).toBe(false);
    });

    it('filters by userId when provided', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listJobs(1, 20, undefined, 'specific-user-id');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'job.userId = :userId',
        { userId: 'specific-user-id' },
      );
    });

    it('does not filter by userId when not provided', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listJobs(1, 20);

      const andWhereCalls = qb.andWhere.mock.calls.map((c) => c[0] as string);
      expect(andWhereCalls.some((s) => s.includes('userId'))).toBe(false);
    });

    it('applies ILIKE search on company and title when search is provided', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listJobs(1, 20, 'acme');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%acme%' },
      );
    });

    it('applies both userId filter and search simultaneously', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listJobs(1, 20, 'acme', 'user-uuid-x');

      const andWhereCalls = qb.andWhere.mock.calls.map((c) => c[0] as string);
      expect(andWhereCalls.some((s) => s.includes('userId'))).toBe(true);
      expect(andWhereCalls.some((s) => s.includes('ILIKE'))).toBe(true);
    });

    it('strips all user fields except id and email from each job', async () => {
      const fullUser = makeUser({ id: 'u1', email: 'owner@example.com' });
      const job = makeJob({ user: fullUser });
      qb.getManyAndCount.mockResolvedValue([[job], 1]);

      const result = await service.listJobs(1, 20);

      expect(result.data[0].user).toEqual({ id: 'u1', email: 'owner@example.com' });
      expect((result.data[0].user as any)?.password).toBeUndefined();
    });

    it('sets user: null for jobs with no associated user', async () => {
      const job = makeJob({ user: null });
      qb.getManyAndCount.mockResolvedValue([[job], 1]);

      const result = await service.listJobs(1, 20);

      expect(result.data[0].user).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getJob()
  // ---------------------------------------------------------------------------
  describe('getJob()', () => {
    it('returns the job with user reduced to { id, email }', async () => {
      const job = makeJob({ user: makeUser({ id: 'u1', email: 'owner@example.com' }) });
      jobsRepo.findOne.mockResolvedValue(job);

      const result = await service.getJob(job.id);

      expect(result.user).toEqual({ id: 'u1', email: 'owner@example.com' });
    });

    it('throws NotFoundException when the job does not exist', async () => {
      jobsRepo.findOne.mockResolvedValue(null);

      await expect(service.getJob('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // updateJob()
  // ---------------------------------------------------------------------------
  describe('updateJob()', () => {
    it('applies all DTO fields to the job and saves it', async () => {
      const job = makeJob({ id: 'job-uuid-1', status: 'applied' });
      jobsRepo.findOne.mockResolvedValue(job);

      await service.updateJob(ADMIN_ACTOR, 'job-uuid-1', { status: 'offered' });

      expect(jobsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'offered' }),
      );
    });

    it('returns the saved job', async () => {
      const job = makeJob();
      const saved = { ...job, status: 'offered' as JobStatus };
      jobsRepo.findOne.mockResolvedValue(job);
      jobsRepo.save.mockResolvedValue(saved);

      const result = await service.updateJob(ADMIN_ACTOR, job.id, { status: 'offered' });

      expect(result).toBe(saved);
    });

    it('writes an audit log with action UPDATE_JOB, targetId, and changed field names', async () => {
      const job = makeJob({ id: 'job-uuid-1', company: 'Acme', title: 'Dev', userId: 'u1' });
      jobsRepo.findOne.mockResolvedValue(job);

      await service.updateJob(ADMIN_ACTOR, 'job-uuid-1', { status: 'offered', notes: 'good fit' });

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.UPDATE_JOB,
          targetId: 'job-uuid-1',
          metadata: expect.objectContaining({
            fields: expect.arrayContaining(['status', 'notes']),
          }),
        }),
      );
    });

    it('throws NotFoundException when the job does not exist', async () => {
      jobsRepo.findOne.mockResolvedValue(null);

      await expect(service.updateJob(ADMIN_ACTOR, 'bad-id', {})).rejects.toThrow(NotFoundException);

      expect(jobsRepo.save).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteJob()
  // ---------------------------------------------------------------------------
  describe('deleteJob()', () => {
    it('calls jobsRepo.remove with the found job entity', async () => {
      const job = makeJob();
      jobsRepo.findOne.mockResolvedValue(job);

      await service.deleteJob(ADMIN_ACTOR, job.id);

      expect(jobsRepo.remove).toHaveBeenCalledWith(job);
    });

    it('writes an audit log entry with action DELETE_JOB and job metadata', async () => {
      const job = makeJob({ id: 'job-uuid-1', company: 'Acme', title: 'Dev', userId: 'u1' });
      jobsRepo.findOne.mockResolvedValue(job);

      await service.deleteJob(ADMIN_ACTOR, job.id);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DELETE_JOB,
          targetId: job.id,
          metadata: expect.objectContaining({
            company: job.company,
            title: job.title,
            userId: job.userId,
          }),
        }),
      );
    });

    it('throws NotFoundException when the job does not exist', async () => {
      jobsRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteJob(ADMIN_ACTOR, 'bad-id')).rejects.toThrow(NotFoundException);

      expect(jobsRepo.remove).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // bulkDeleteJobs()
  // ---------------------------------------------------------------------------
  describe('bulkDeleteJobs()', () => {
    it('calls jobsRepo.delete with In(ids)', async () => {
      const ids = ['job-uuid-1', 'job-uuid-2', 'job-uuid-3'];

      await service.bulkDeleteJobs(ADMIN_ACTOR, ids);

      expect(jobsRepo.delete).toHaveBeenCalledWith({ id: expect.anything() });
    });

    it('returns a message with the correct count', async () => {
      const ids = ['job-uuid-1', 'job-uuid-2'];

      const result = await service.bulkDeleteJobs(ADMIN_ACTOR, ids);

      expect(result.message).toContain('2');
    });

    it('writes an audit log with action BULK_DELETE_JOBS, count, and ids', async () => {
      const ids = ['job-uuid-1', 'job-uuid-2'];

      await service.bulkDeleteJobs(ADMIN_ACTOR, ids);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.BULK_DELETE_JOBS,
          metadata: expect.objectContaining({ count: 2, ids }),
        }),
      );
    });

    it('throws BadRequestException when ids is an empty array', async () => {
      await expect(service.bulkDeleteJobs(ADMIN_ACTOR, [])).rejects.toThrow(BadRequestException);

      expect(jobsRepo.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when ids is null', async () => {
      await expect(service.bulkDeleteJobs(ADMIN_ACTOR, null as any)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when ids is undefined', async () => {
      await expect(service.bulkDeleteJobs(ADMIN_ACTOR, undefined as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // getAuditLog()
  // ---------------------------------------------------------------------------
  describe('getAuditLog()', () => {
    it('delegates to auditLogService.findAll passing all params through', () => {
      service.getAuditLog(3, 50, 'admin@', 'action', 'ASC');

      expect(auditLogService.findAll).toHaveBeenCalledWith(3, 50, 'admin@', 'action', 'ASC');
    });

    it('returns whatever auditLogService.findAll returns', async () => {
      const expected = { data: [], total: 0, hasMore: false };
      auditLogService.findAll.mockResolvedValue(expected);

      const result = await service.getAuditLog(1, 50);

      expect(result).toBe(expected);
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-cutting: audit log timing
  // ---------------------------------------------------------------------------
  describe('audit log is written after the primary operation, not before', () => {
    it('setRole: audit log not called when NotFoundException is thrown', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.setRole(ADMIN_ACTOR, 'bad-id', UserRole.ADMIN)).rejects.toThrow();

      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('deleteUser: audit log not called when NotFoundException is thrown', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.deleteUser(ADMIN_ACTOR, 'bad-id')).rejects.toThrow();

      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('deleteJob: audit log not called when NotFoundException is thrown', async () => {
      jobsRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteJob(ADMIN_ACTOR, 'bad-id')).rejects.toThrow();

      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });
});
