/**
 * api/jobs.ts — Job applications API module.
 *
 * Wraps all /jobs/* endpoints for the authenticated user's own job applications.
 * Supports paginated listing, full-text search, single-record fetch, and full
 * CRUD operations. All methods return Promises that resolve with the typed
 * response body or reject with a user-facing error string.
 */

import { api } from './client';
import type { JobApplication, CreateJobDto, UpdateJobDto } from '@/types';

/** Shape returned by list and search endpoints. */
export interface PaginatedJobs {
  /** The job records for the requested page. */
  data: JobApplication[];
  /** Total number of records matching the current filter. */
  total: number;
  /** Whether a subsequent page exists. */
  hasMore: boolean;
  /** Count of jobs grouped by status for the current filter set. */
  statusCounts: Record<string, number>;
}

export const jobsApi = {
  /**
   * Fetches a paginated list of the user's job applications, optionally
   * filtered by status.
   *
   * @param page   - 1-based page number (default 1).
   * @param limit  - Records per page (default 20).
   * @param status - Optional status filter ('applied' | 'interviewing' | 'offered' | 'rejected').
   * @returns A PaginatedJobs response including statusCounts.
   */
  getAll: (page = 1, limit = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return api.get<PaginatedJobs>(`/jobs?${params}`);
  },

  /**
   * Searches job applications by a text query across company and title fields,
   * optionally narrowed by status.
   *
   * @param query  - The search string.
   * @param status - Optional status filter.
   * @returns A PaginatedJobs response for the matching records.
   */
  search: (query: string, status?: string) => {
    const params = new URLSearchParams({ search: query });
    if (status) params.set('status', status);
    return api.get<PaginatedJobs>(`/jobs?${params}`);
  },

  /**
   * Fetches a single job application by its ID.
   *
   * @param id - The UUID of the job application.
   * @returns The full JobApplication record.
   */
  getOne: (id: string) => api.get<JobApplication>(`/jobs/${id}`),

  /**
   * Creates a new job application for the authenticated user.
   *
   * @param dto - The creation payload (company, title, dateApplied, status, etc.).
   * @returns The newly created JobApplication record.
   */
  create: (dto: CreateJobDto) => api.post<JobApplication>('/jobs', dto),

  /**
   * Updates an existing job application with the provided fields.
   *
   * @param id  - The UUID of the job application to update.
   * @param dto - Partial update payload containing only the fields to change.
   * @returns The updated JobApplication record.
   */
  update: (id: string, dto: UpdateJobDto) =>
    api.patch<JobApplication>(`/jobs/${id}`, dto),

  /**
   * Permanently deletes a job application.
   *
   * @param id - The UUID of the job application to delete.
   * @returns void (204 No Content).
   */
  delete: (id: string) => api.delete<void>(`/jobs/${id}`),
};
