/**
 * api/admin.ts — Admin API module.
 *
 * Wraps all /admin/* endpoints used by the admin section of the application.
 * Covers dashboard statistics, charts, paginated user and job management,
 * user account actions (role, suspension, verification, password reset, delete),
 * job editing and bulk deletion, and the audit log.
 *
 * All methods require the caller to hold a valid admin JWT (enforced server-side).
 */

import { api } from './client';
import type { UserRole } from '@/types';

/** Aggregate statistics shown on the admin dashboard overview. */
export interface AdminStats {
  users: {
    total: number;
    verified: number;
    suspended: number;
    admins: number;
  };
  jobs: {
    total: number;
    /** Count of jobs grouped by status key. */
    byStatus: Record<string, number>;
  };
}

/** Extended user record returned by admin endpoints (includes per-status job counts). */
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

/** Job record returned by admin endpoints (includes the owning user). */
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
  /** The user who owns this job application, or null if the user was deleted. */
  user: { id: string; email: string } | null;
}

/** A single entry in the admin audit trail. */
export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  /** Action key e.g. 'SET_ROLE', 'DELETE_USER', 'SUSPEND_USER'. */
  action: string;
  /** Type of entity the action targeted e.g. 'user' or 'job'. */
  targetType: string;
  targetId?: string;
  /** Arbitrary action-specific metadata (email, company—title, count, etc.). */
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** Chart datasets used to render the three graphs on the admin dashboard. */
export interface AdminCharts {
  userGrowth: {
    labels: string[];   // 'YYYY-MM' month strings
    data: number[];
  };
  jobActivity: {
    labels: string[];
    datasets: Record<'applied' | 'interviewing' | 'offered' | 'rejected', number[]>;
  };
  topCompanies: {
    labels: string[];
    data: number[];
  };
}

/** Generic paginated list wrapper used by user, job and audit-log list endpoints. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export const adminApi = {
  // ── Stats & Charts ──────────────────────────────────────────────────────────

  /**
   * Fetches aggregate user and job statistics for the dashboard overview.
   * @returns AdminStats with user counts and per-status job counts.
   */
  getStats: () => api.get<AdminStats>('/admin/stats'),

  /**
   * Fetches time-series chart data for user growth, job activity and top companies.
   * @returns AdminCharts containing labelled datasets for Chart.js.
   */
  getCharts: () => api.get<AdminCharts>('/admin/charts'),

  // ── Audit Log ───────────────────────────────────────────────────────────────

  /**
   * Fetches a paginated, searchable, sortable list of admin audit log entries.
   *
   * @param page      - 1-based page number (default 1).
   * @param limit     - Records per page (default 50).
   * @param search    - Optional text filter applied to admin email or target ID.
   * @param sortBy    - Column to sort by (e.g. 'createdAt', 'action').
   * @param sortOrder - Sort direction: 'ASC' or 'DESC'.
   * @returns Paginated AuditLogEntry records.
   */
  getAuditLog: (page = 1, limit = 50, search?: string, sortBy?: string, sortOrder?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    return api.get<PaginatedResponse<AuditLogEntry>>(`/admin/audit-log?${params}`);
  },

  // ── Users ───────────────────────────────────────────────────────────────────

  /**
   * Fetches a paginated, searchable, sortable list of all users.
   *
   * @param page      - 1-based page number (default 1).
   * @param limit     - Records per page (default 20).
   * @param search    - Optional text filter applied to email or user ID.
   * @param sortBy    - Column to sort by (e.g. 'email', 'createdAt', 'jobCount').
   * @param sortOrder - Sort direction: 'ASC' or 'DESC'.
   * @returns Paginated AdminUser records.
   */
  listUsers: (page = 1, limit = 20, search?: string, sortBy?: string, sortOrder?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    return api.get<PaginatedResponse<AdminUser>>(`/admin/users?${params}`);
  },

  /**
   * Fetches a single user by their ID, including per-status job counts.
   *
   * @param id - The UUID of the user.
   * @returns The full AdminUser record.
   */
  getUser: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),

  /**
   * Promotes or demotes a user's role.
   *
   * @param id   - The UUID of the user.
   * @param role - The target role: 'admin' or 'user'.
   * @returns A confirmation message.
   */
  setRole: (id: string, role: UserRole) =>
    api.patch<{ message: string }>(`/admin/users/${id}/role`, { role }),

  /**
   * Suspends a user account, preventing login.
   *
   * @param id - The UUID of the user.
   * @returns A confirmation message.
   */
  suspendUser: (id: string) =>
    api.patch<{ message: string }>(`/admin/users/${id}/suspend`, {}),

  /**
   * Lifts a suspension, restoring login access.
   *
   * @param id - The UUID of the user.
   * @returns A confirmation message.
   */
  unsuspendUser: (id: string) =>
    api.patch<{ message: string }>(`/admin/users/${id}/unsuspend`, {}),

  /**
   * Permanently deletes a user account and all their job applications.
   *
   * @param id - The UUID of the user.
   * @returns void (204 No Content).
   */
  deleteUser: (id: string) =>
    api.delete<void>(`/admin/users/${id}`),

  /**
   * Marks a user's email as verified without requiring them to click an email link.
   *
   * @param id - The UUID of the user.
   * @returns A confirmation message.
   */
  forceVerify: (id: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/verify`, {}),

  /**
   * Triggers a new verification email to be sent to the user's address.
   *
   * @param id - The UUID of the user.
   * @returns A confirmation message.
   */
  resendVerification: (id: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/resend-verification`, {}),

  /**
   * Sends a password reset email to the user on behalf of an admin.
   *
   * @param id - The UUID of the user.
   * @returns A confirmation message.
   */
  triggerPasswordReset: (id: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/reset-password`, {}),

  // ── Jobs ────────────────────────────────────────────────────────────────────

  /**
   * Fetches a paginated, searchable, sortable list of all job applications
   * across all users.
   *
   * @param page      - 1-based page number (default 1).
   * @param limit     - Records per page (default 20).
   * @param search    - Optional text filter applied to company or title.
   * @param userId    - Optional filter to show only jobs for a specific user.
   * @param sortBy    - Column to sort by (e.g. 'company', 'dateApplied').
   * @param sortOrder - Sort direction: 'ASC' or 'DESC'.
   * @returns Paginated AdminJob records including the owning user.
   */
  listJobs: (page = 1, limit = 20, search?: string, userId?: string, sortBy?: string, sortOrder?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (userId) params.set('userId', userId);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    return api.get<PaginatedResponse<AdminJob>>(`/admin/jobs?${params}`);
  },

  /**
   * Fetches a single job application by its ID, including the owning user.
   *
   * @param id - The UUID of the job application.
   * @returns The full AdminJob record.
   */
  getJob: (id: string) => api.get<AdminJob>(`/admin/jobs/${id}`),

  /**
   * Updates any fields on a job application.
   *
   * @param id  - The UUID of the job application.
   * @param dto - Partial AdminJob payload with the fields to update.
   * @returns The updated AdminJob record.
   */
  updateJob: (id: string, dto: Partial<AdminJob>) =>
    api.patch<AdminJob>(`/admin/jobs/${id}`, dto),

  /**
   * Permanently deletes a single job application.
   *
   * @param id - The UUID of the job application.
   * @returns void (204 No Content).
   */
  deleteJob: (id: string) =>
    api.delete<void>(`/admin/jobs/${id}`),

  /**
   * Permanently deletes multiple job applications in a single request.
   *
   * @param ids - Array of job application UUIDs to delete.
   * @returns A confirmation message with the count of deleted records.
   */
  bulkDeleteJobs: (ids: string[]) =>
    api.delete<{ message: string }>(`/admin/jobs`, { ids }),
};
