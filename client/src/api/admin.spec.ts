import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('./client', () => ({
  api: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete },
}));

describe('adminApi', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Stats ──────────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('calls api.get("/admin/stats")', async () => {
      mockGet.mockResolvedValue({});
      const { adminApi } = await import('./admin');
      await adminApi.getStats();
      expect(mockGet).toHaveBeenCalledWith('/admin/stats');
    });
  });

  // ── Audit Log ──────────────────────────────────────────────────────────────

  describe('getAuditLog()', () => {
    it('calls with default page=1 and limit=50', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.getAuditLog();
      expect(mockGet).toHaveBeenCalledWith('/admin/audit-log?page=1&limit=50');
    });

    it('calls with explicit page and limit', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.getAuditLog(3, 25);
      expect(mockGet).toHaveBeenCalledWith('/admin/audit-log?page=3&limit=25');
    });
  });

  // ── Users ──────────────────────────────────────────────────────────────────

  describe('listUsers()', () => {
    it('calls with default page=1 and limit=20', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.listUsers();
      expect(mockGet).toHaveBeenCalledWith('/admin/users?page=1&limit=20');
    });

    it('includes search param when provided', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.listUsers(1, 20, 'alice');
      expect(mockGet).toHaveBeenCalledWith('/admin/users?page=1&limit=20&search=alice');
    });

    it('omits search param when not provided', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.listUsers(1, 20);
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).not.toContain('search');
    });

    it('uses the provided page and limit', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.listUsers(2, 50);
      expect(mockGet).toHaveBeenCalledWith('/admin/users?page=2&limit=50');
    });
  });

  describe('getUser()', () => {
    it('calls api.get with the correct user URL', async () => {
      mockGet.mockResolvedValue({});
      const { adminApi } = await import('./admin');
      await adminApi.getUser('user-uuid-1');
      expect(mockGet).toHaveBeenCalledWith('/admin/users/user-uuid-1');
    });
  });

  describe('setRole()', () => {
    it('calls api.patch with the correct URL and body', async () => {
      mockPatch.mockResolvedValue({ message: 'ok' });
      const { adminApi } = await import('./admin');
      await adminApi.setRole('user-uuid-1', 'admin');
      expect(mockPatch).toHaveBeenCalledWith('/admin/users/user-uuid-1/role', { role: 'admin' });
    });
  });

  describe('suspendUser()', () => {
    it('calls api.patch with the suspend endpoint', async () => {
      mockPatch.mockResolvedValue({ message: 'ok' });
      const { adminApi } = await import('./admin');
      await adminApi.suspendUser('user-uuid-1');
      expect(mockPatch).toHaveBeenCalledWith('/admin/users/user-uuid-1/suspend', {});
    });
  });

  describe('unsuspendUser()', () => {
    it('calls api.patch with the unsuspend endpoint', async () => {
      mockPatch.mockResolvedValue({ message: 'ok' });
      const { adminApi } = await import('./admin');
      await adminApi.unsuspendUser('user-uuid-1');
      expect(mockPatch).toHaveBeenCalledWith('/admin/users/user-uuid-1/unsuspend', {});
    });
  });

  describe('deleteUser()', () => {
    it('calls api.delete with the correct user URL', async () => {
      mockDelete.mockResolvedValue(null);
      const { adminApi } = await import('./admin');
      await adminApi.deleteUser('user-uuid-1');
      expect(mockDelete).toHaveBeenCalledWith('/admin/users/user-uuid-1');
    });
  });

  describe('forceVerify()', () => {
    it('calls api.post with the verify endpoint', async () => {
      mockPost.mockResolvedValue({ message: 'ok' });
      const { adminApi } = await import('./admin');
      await adminApi.forceVerify('user-uuid-1');
      expect(mockPost).toHaveBeenCalledWith('/admin/users/user-uuid-1/verify', {});
    });
  });

  describe('resendVerification()', () => {
    it('calls api.post with the resend-verification endpoint', async () => {
      mockPost.mockResolvedValue({ message: 'ok' });
      const { adminApi } = await import('./admin');
      await adminApi.resendVerification('user-uuid-1');
      expect(mockPost).toHaveBeenCalledWith('/admin/users/user-uuid-1/resend-verification', {});
    });
  });

  describe('triggerPasswordReset()', () => {
    it('calls api.post with the reset-password endpoint', async () => {
      mockPost.mockResolvedValue({ message: 'ok' });
      const { adminApi } = await import('./admin');
      await adminApi.triggerPasswordReset('user-uuid-1');
      expect(mockPost).toHaveBeenCalledWith('/admin/users/user-uuid-1/reset-password', {});
    });
  });

  // ── Jobs ───────────────────────────────────────────────────────────────────

  describe('listJobs()', () => {
    it('calls with default page=1 and limit=20', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.listJobs();
      expect(mockGet).toHaveBeenCalledWith('/admin/jobs?page=1&limit=20');
    });

    it('includes search param when provided', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.listJobs(1, 20, 'acme');
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain('search=acme');
    });

    it('includes userId param when provided', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.listJobs(1, 20, undefined, 'user-uuid-1');
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain('userId=user-uuid-1');
    });

    it('includes both search and userId simultaneously', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.listJobs(1, 20, 'acme', 'user-uuid-1');
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain('search=acme');
      expect(url).toContain('userId=user-uuid-1');
    });

    it('omits optional params when not provided', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
      const { adminApi } = await import('./admin');
      await adminApi.listJobs();
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).not.toContain('search');
      expect(url).not.toContain('userId');
    });
  });

  describe('getJob()', () => {
    it('calls api.get with the correct job URL', async () => {
      mockGet.mockResolvedValue({});
      const { adminApi } = await import('./admin');
      await adminApi.getJob('job-uuid-1');
      expect(mockGet).toHaveBeenCalledWith('/admin/jobs/job-uuid-1');
    });
  });

  describe('updateJob()', () => {
    it('calls api.patch with the correct URL and dto', async () => {
      mockPatch.mockResolvedValue({});
      const { adminApi } = await import('./admin');
      const dto = { status: 'offered' } as any;
      await adminApi.updateJob('job-uuid-1', dto);
      expect(mockPatch).toHaveBeenCalledWith('/admin/jobs/job-uuid-1', dto);
    });
  });

  describe('deleteJob()', () => {
    it('calls api.delete with the correct job URL', async () => {
      mockDelete.mockResolvedValue(null);
      const { adminApi } = await import('./admin');
      await adminApi.deleteJob('job-uuid-1');
      expect(mockDelete).toHaveBeenCalledWith('/admin/jobs/job-uuid-1');
    });
  });

  describe('bulkDeleteJobs()', () => {
    it('calls api.delete with the /admin/jobs endpoint and ids in the body', async () => {
      mockDelete.mockResolvedValue({ message: 'ok' });
      const { adminApi } = await import('./admin');
      await adminApi.bulkDeleteJobs(['job-uuid-1', 'job-uuid-2']);
      expect(mockDelete).toHaveBeenCalledWith('/admin/jobs', { ids: ['job-uuid-1', 'job-uuid-2'] });
    });
  });
});
