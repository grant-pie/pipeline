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
  const currentPage = ref(0);
  const currentSearch = ref<string | undefined>(undefined);
  const currentStatus = ref<string | undefined>(undefined);

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

  async function searchJobs(query: string, status?: string) {
    searching.value = true;
    error.value = null;
    currentSearch.value = query;
    currentStatus.value = status;
    try {
      const result = await jobsApi.search(query, status);
      jobs.value = result.data;
      hasMore.value = false;
      total.value = result.total;
      statusCounts.value = result.statusCounts;
      currentPage.value = 0;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      searching.value = false;
    }
  }

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
      // silently fail — user can scroll again to retry
    } finally {
      loadingMore.value = false;
    }
  }

  async function createJob(dto: CreateJobDto): Promise<JobApplication> {
    const job = await jobsApi.create(dto);
    jobs.value.unshift(job);
    return job;
  }

  async function updateJob(id: string, dto: UpdateJobDto): Promise<JobApplication> {
    const updated = await jobsApi.update(id, dto);
    const index = jobs.value.findIndex((j) => j.id === id);
    if (index !== -1) jobs.value[index] = updated;
    return updated;
  }

  async function deleteJob(id: string) {
    await jobsApi.delete(id);
    jobs.value = jobs.value.filter((j) => j.id !== id);
  }

  function getJob(id: string): JobApplication | null {
    return jobs.value.find((j) => j.id === id) ?? null;
  }

  return { jobs, loading, loadingMore, searching, error, hasMore, total, statusCounts, fetchJobs, searchJobs, fetchNextPage, createJob, updateJob, deleteJob, getJob };
});
