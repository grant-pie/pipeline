/**
 * stores/jobs.ts — Job applications Pinia store.
 *
 * Manages the in-memory list of job applications for the authenticated user.
 * Handles three distinct loading states:
 *   loading     — Initial page-1 fetch or status/filter change.
 *   loadingMore — Appending the next page via infinite scroll.
 *   searching   — Full-text search (replaces the list without a loading spinner
 *                 so the existing results remain visible during the request).
 *
 * Keeps pagination cursors (currentPage, currentStatus, currentSearch) so that
 * fetchNextPage can continue from where the last fetch left off.
 *
 * Local cache: getJob() looks up a record from the in-memory list, allowing
 * JobFormView to pre-fill the edit form without an extra API round-trip.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { jobsApi } from '@/api/jobs';
import type { JobApplication, CreateJobDto, UpdateJobDto } from '@/types';

export const useJobsStore = defineStore('jobs', () => {
  const jobs = ref<JobApplication[]>([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const searching = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(false);
  const total = ref(0);
  const statusCounts = ref<Record<string, number>>({});

  // Pagination cursors — used by fetchNextPage to continue the last query.
  const currentPage = ref(0);
  const currentSearch = ref<string | undefined>(undefined);
  const currentStatus = ref<string | undefined>(undefined);

  /**
   * Fetches page 1 of the user's job applications, optionally filtered by
   * status. Resets search state and replaces the current job list.
   *
   * @param status - Optional status filter to apply ('applied', 'interviewing',
   *                 'offered', or 'rejected'). Pass undefined for all statuses.
   */
  async function fetchJobs(status?: string) {
    loading.value = true;
    error.value = null;
    currentSearch.value = undefined;
    currentStatus.value = status;
    try {
      const result = await jobsApi.getAll(1, 20, status);
      jobs.value = result.data;
      hasMore.value = result.hasMore;
      total.value = result.total;
      statusCounts.value = result.statusCounts;
      currentPage.value = 1;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Performs a full-text search and replaces the job list with the results.
   * Uses the `searching` flag (not `loading`) so the existing list stays
   * visible at reduced opacity during the request.
   *
   * @param query  - The search string.
   * @param status - Optional status filter to narrow results.
   */
  async function searchJobs(query: string, status?: string) {
    searching.value = true;
    error.value = null;
    currentSearch.value = query;
    currentStatus.value = status;
    try {
      const result = await jobsApi.search(query, status);
      jobs.value = result.data;
      hasMore.value = false; // Search results are not paginated.
      total.value = result.total;
      statusCounts.value = result.statusCounts;
      currentPage.value = 0;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      searching.value = false;
    }
  }

  /**
   * Appends the next page of results to the current job list. Used by the
   * IntersectionObserver in DashboardView for infinite scroll. Exits silently
   * if there are no more pages or if a fetch is already in progress.
   * Failures are swallowed — the user can trigger another attempt by scrolling.
   */
  async function fetchNextPage() {
    if (!hasMore.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
      const nextPage = currentPage.value + 1;
      const result = await jobsApi.getAll(nextPage, 20, currentStatus.value);
      jobs.value.push(...result.data);
      hasMore.value = result.hasMore;
      currentPage.value = nextPage;
    } catch {
      // Silently fail — user can scroll again to retry.
    } finally {
      loadingMore.value = false;
    }
  }

  /**
   * Creates a new job application via the API and prepends it to the local list
   * so it appears immediately at the top of the dashboard.
   *
   * @param dto - The creation payload.
   * @returns The newly created JobApplication record.
   */
  async function createJob(dto: CreateJobDto): Promise<JobApplication> {
    const job = await jobsApi.create(dto);
    jobs.value.unshift(job);
    return job;
  }

  /**
   * Updates an existing job application via the API and replaces the matching
   * record in the local list in-place.
   *
   * @param id  - The UUID of the job to update.
   * @param dto - Partial update payload.
   * @returns The updated JobApplication record.
   */
  async function updateJob(id: string, dto: UpdateJobDto): Promise<JobApplication> {
    const updated = await jobsApi.update(id, dto);
    const index = jobs.value.findIndex((j) => j.id === id);
    if (index !== -1) jobs.value[index] = updated;
    return updated;
  }

  /**
   * Deletes a job application via the API and removes it from the local list.
   *
   * @param id - The UUID of the job to delete.
   */
  async function deleteJob(id: string) {
    await jobsApi.delete(id);
    jobs.value = jobs.value.filter((j) => j.id !== id);
  }

  /**
   * Looks up a job application in the local cache by ID.
   * Used by JobFormView to pre-fill the edit form without an extra API call.
   *
   * @param id - The UUID to look up.
   * @returns The matching JobApplication, or null if not in the local cache.
   */
  function getJob(id: string): JobApplication | null {
    return jobs.value.find((j) => j.id === id) ?? null;
  }

  return { jobs, loading, loadingMore, searching, error, hasMore, total, statusCounts, fetchJobs, searchJobs, fetchNextPage, createJob, updateJob, deleteJob, getJob };
});
