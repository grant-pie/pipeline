import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

// A req object that simulates a logged-in admin
const ADMIN_REQ = {
  user: { id: 'admin-uuid-1', email: 'admin@example.com', role: UserRole.ADMIN },
};

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    adminService = {
      getStats: jest.fn().mockResolvedValue({}),
      getAuditLog: jest.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
      listUsers: jest.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
      getUser: jest.fn().mockResolvedValue({}),
      setRole: jest.fn().mockResolvedValue({ message: 'ok' }),
      suspendUser: jest.fn().mockResolvedValue({ message: 'ok' }),
      unsuspendUser: jest.fn().mockResolvedValue({ message: 'ok' }),
      deleteUser: jest.fn().mockResolvedValue({ message: 'ok' }),
      forceVerifyUser: jest.fn().mockResolvedValue({ message: 'ok' }),
      resendVerification: jest.fn().mockResolvedValue({ message: 'ok' }),
      triggerPasswordReset: jest.fn().mockResolvedValue({ message: 'ok' }),
      listJobs: jest.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
      getJob: jest.fn().mockResolvedValue({}),
      updateJob: jest.fn().mockResolvedValue({}),
      deleteJob: jest.fn().mockResolvedValue(undefined),
      bulkDeleteJobs: jest.fn().mockResolvedValue({ message: 'ok' }),
    } as unknown as jest.Mocked<AdminService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        // Override guards to allow testing controller logic without JWT
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
        Reflector,
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // Guard metadata
  // ---------------------------------------------------------------------------
  describe('guard metadata', () => {
    it('has JwtAuthGuard applied at the class level', () => {
      const guards: unknown[] = Reflect.getMetadata('__guards__', AdminController) ?? [];
      expect(guards.some((g) => g === JwtAuthGuard)).toBe(true);
    });

    it('has RolesGuard applied at the class level', () => {
      const guards: unknown[] = Reflect.getMetadata('__guards__', AdminController) ?? [];
      expect(guards.some((g) => g === RolesGuard)).toBe(true);
    });

    it('has ADMIN role metadata applied at the class level', () => {
      const roles: string[] = Reflect.getMetadata('roles', AdminController) ?? [];
      expect(roles).toContain(UserRole.ADMIN);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/stats
  // ---------------------------------------------------------------------------
  describe('getStats()', () => {
    it('delegates to adminService.getStats()', async () => {
      await controller.getStats();
      expect(adminService.getStats).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/audit-log
  // ---------------------------------------------------------------------------
  describe('getAuditLog()', () => {
    it('passes parsed page, limit, search, sortBy, and sortOrder to adminService', async () => {
      await controller.getAuditLog({ page: '2', limit: '25', search: 'admin@', sortBy: 'action', sortOrder: 'ASC' });
      expect(adminService.getAuditLog).toHaveBeenCalledWith(2, 25, 'admin@', 'action', 'ASC');
    });

    it('defaults to page=1, limit=50, and undefined optional params when absent', async () => {
      await controller.getAuditLog({});
      expect(adminService.getAuditLog).toHaveBeenCalledWith(1, 50, undefined, undefined, undefined);
    });

    it('clamps page to minimum 1 when page=0', async () => {
      await controller.getAuditLog({ page: '0' });
      const [page] = adminService.getAuditLog.mock.calls[0];
      expect(page).toBe(1);
    });

    it('clamps limit to maximum 100', async () => {
      await controller.getAuditLog({ limit: '999' });
      const [, limit] = adminService.getAuditLog.mock.calls[0];
      expect(limit).toBe(100);
    });

    it('passes undefined for search when query param is whitespace', async () => {
      await controller.getAuditLog({ search: '   ' });
      const [, , search] = adminService.getAuditLog.mock.calls[0];
      expect(search).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/users
  // ---------------------------------------------------------------------------
  describe('listUsers()', () => {
    it('passes parsed page, limit, search, sortBy, and sortOrder to adminService', async () => {
      await controller.listUsers({ page: '2', limit: '10', search: '  alice  ', sortBy: 'email', sortOrder: 'ASC' });
      expect(adminService.listUsers).toHaveBeenCalledWith(2, 10, 'alice', 'email', 'ASC');
    });

    it('defaults to page=1, limit=20, and undefined optional params when absent', async () => {
      await controller.listUsers({});
      expect(adminService.listUsers).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined);
    });

    it('passes undefined for search when the query param is an empty string', async () => {
      await controller.listUsers({ search: '   ' });
      const [, , search] = adminService.listUsers.mock.calls[0];
      expect(search).toBeUndefined();
    });

    it('clamps limit to maximum 100', async () => {
      await controller.listUsers({ limit: '500' });
      const [, limit] = adminService.listUsers.mock.calls[0];
      expect(limit).toBe(100);
    });

    it('clamps page to minimum 1', async () => {
      await controller.listUsers({ page: '-5' });
      const [page] = adminService.listUsers.mock.calls[0];
      expect(page).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/users/:id
  // ---------------------------------------------------------------------------
  describe('getUser()', () => {
    it('passes id to adminService.getUser', async () => {
      await controller.getUser('user-uuid-1');
      expect(adminService.getUser).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /admin/users/:id/role
  // ---------------------------------------------------------------------------
  describe('setRole()', () => {
    it('passes actor, id, and role to adminService.setRole', async () => {
      await controller.setRole('user-uuid-1', { role: UserRole.ADMIN }, ADMIN_REQ as any);

      expect(adminService.setRole).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        'user-uuid-1',
        UserRole.ADMIN,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /admin/users/:id/suspend
  // ---------------------------------------------------------------------------
  describe('suspendUser()', () => {
    it('passes actor and id to adminService.suspendUser', async () => {
      await controller.suspendUser('user-uuid-1', ADMIN_REQ as any);

      expect(adminService.suspendUser).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        'user-uuid-1',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /admin/users/:id/unsuspend
  // ---------------------------------------------------------------------------
  describe('unsuspendUser()', () => {
    it('passes actor and id to adminService.unsuspendUser', async () => {
      await controller.unsuspendUser('user-uuid-1', ADMIN_REQ as any);

      expect(adminService.unsuspendUser).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        'user-uuid-1',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /admin/users/:id
  // ---------------------------------------------------------------------------
  describe('deleteUser()', () => {
    it('passes actor and id to adminService.deleteUser', async () => {
      await controller.deleteUser('user-uuid-1', ADMIN_REQ as any);

      expect(adminService.deleteUser).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        'user-uuid-1',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // POST /admin/users/:id/verify
  // ---------------------------------------------------------------------------
  describe('forceVerify()', () => {
    it('passes actor and id to adminService.forceVerifyUser', async () => {
      await controller.forceVerify('user-uuid-1', ADMIN_REQ as any);

      expect(adminService.forceVerifyUser).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        'user-uuid-1',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // POST /admin/users/:id/resend-verification
  // ---------------------------------------------------------------------------
  describe('resendVerification()', () => {
    it('passes actor and id to adminService.resendVerification', async () => {
      await controller.resendVerification('user-uuid-1', ADMIN_REQ as any);

      expect(adminService.resendVerification).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        'user-uuid-1',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // POST /admin/users/:id/reset-password
  // ---------------------------------------------------------------------------
  describe('triggerPasswordReset()', () => {
    it('passes actor and id to adminService.triggerPasswordReset', async () => {
      await controller.triggerPasswordReset('user-uuid-1', ADMIN_REQ as any);

      expect(adminService.triggerPasswordReset).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        'user-uuid-1',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/jobs
  // ---------------------------------------------------------------------------
  describe('listJobs()', () => {
    it('passes parsed page, limit, search, userId, sortBy, and sortOrder to adminService', async () => {
      await controller.listJobs({ page: '3', limit: '15', search: 'acme', userId: 'u1', sortBy: 'company', sortOrder: 'ASC' });

      expect(adminService.listJobs).toHaveBeenCalledWith(3, 15, 'acme', 'u1', 'company', 'ASC');
    });

    it('defaults to page=1, limit=20, and undefined optional params when absent', async () => {
      await controller.listJobs({});
      expect(adminService.listJobs).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined, undefined);
    });

    it('passes undefined for userId when not in query', async () => {
      await controller.listJobs({ page: '1' });
      const [, , , userId] = adminService.listJobs.mock.calls[0];
      expect(userId).toBeUndefined();
    });

    it('clamps limit to maximum 100', async () => {
      await controller.listJobs({ limit: '999' });
      const [, limit] = adminService.listJobs.mock.calls[0];
      expect(limit).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/jobs/:id
  // ---------------------------------------------------------------------------
  describe('getJob()', () => {
    it('passes id to adminService.getJob', async () => {
      await controller.getJob('job-uuid-1');
      expect(adminService.getJob).toHaveBeenCalledWith('job-uuid-1');
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /admin/jobs/:id
  // ---------------------------------------------------------------------------
  describe('updateJob()', () => {
    it('passes actor, id, and body dto to adminService.updateJob', async () => {
      const dto = { status: 'offered' } as any;
      await controller.updateJob('job-uuid-1', dto, ADMIN_REQ as any);

      expect(adminService.updateJob).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        'job-uuid-1',
        dto,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /admin/jobs/:id
  // ---------------------------------------------------------------------------
  describe('deleteJob()', () => {
    it('passes actor and id to adminService.deleteJob', async () => {
      await controller.deleteJob('job-uuid-1', ADMIN_REQ as any);

      expect(adminService.deleteJob).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        'job-uuid-1',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /admin/jobs (bulk)
  // ---------------------------------------------------------------------------
  describe('bulkDeleteJobs()', () => {
    it('passes actor and ids to adminService.bulkDeleteJobs', async () => {
      const ids = ['job-uuid-1', 'job-uuid-2'];
      await controller.bulkDeleteJobs(ids, ADMIN_REQ as any);

      expect(adminService.bulkDeleteJobs).toHaveBeenCalledWith(
        { id: ADMIN_REQ.user.id, email: ADMIN_REQ.user.email },
        ids,
      );
    });
  });
});
