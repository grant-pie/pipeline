import { api } from './client';
import type { UserRole } from '@/types';

export interface AdminStats {
  users: {
    total: number;
    verified: number;
    suspended: number;
    admins: number;
  };
  jobs: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  jobCount?: number;
  appliedCount?: number;
  interviewingCount?: number;
  offeredCount?: number;
  rejectedCount?: number;
}

export interface AdminJob {
  id: string;
  company: string;
  title: string;
  dateApplied: string;
  status: string;
  notes?: string;
  link?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string } | null;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export const adminApi = {
  // Stats
  getStats: () => api.get<AdminStats>('/admin/stats'),

  // Audit log
  getAuditLog: (page = 1, limit = 50) =>
    api.get<PaginatedResponse<AuditLogEntry>>(`/admin/audit-log?page=${page}&limit=${limit}`),

  // Users
  listUsers: (page = 1, limit = 20, search?: string, sortBy?: string, sortOrder?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    return api.get<PaginatedResponse<AdminUser>>(`/admin/users?${params}`);
  },

  getUser: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),

  setRole: (id: string, role: UserRole) =>
    api.patch<{ message: string }>(`/admin/users/${id}/role`, { role }),

  suspendUser: (id: string) =>
    api.patch<{ message: string }>(`/admin/users/${id}/suspend`, {}),

  unsuspendUser: (id: string) =>
    api.patch<{ message: string }>(`/admin/users/${id}/unsuspend`, {}),

  deleteUser: (id: string) =>
    api.delete<void>(`/admin/users/${id}`),

  forceVerify: (id: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/verify`, {}),

  resendVerification: (id: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/resend-verification`, {}),

  triggerPasswordReset: (id: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/reset-password`, {}),

  // Jobs
  listJobs: (page = 1, limit = 20, search?: string, userId?: string, sortBy?: string, sortOrder?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (userId) params.set('userId', userId);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    return api.get<PaginatedResponse<AdminJob>>(`/admin/jobs?${params}`);
  },

  getJob: (id: string) => api.get<AdminJob>(`/admin/jobs/${id}`),

  updateJob: (id: string, dto: Partial<AdminJob>) =>
    api.patch<AdminJob>(`/admin/jobs/${id}`, dto),

  deleteJob: (id: string) =>
    api.delete<void>(`/admin/jobs/${id}`),

  bulkDeleteJobs: (ids: string[]) =>
    api.delete<{ message: string }>(`/admin/jobs`, { ids }),
};
