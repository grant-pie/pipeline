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
  const currentPage = ref(0);

  async function fetchJobs() {
    loading.value = true;
    error.value = null;
    try {
      const result = await jobsApi.getAll(1);
      jobs.value = result.data;
      hasMore.value = result.hasMore;
      currentPage.value = 1;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function searchJobs(query: string) {
    searching.value = true;
    error.value = null;
    try {
      const result = await jobsApi.search(query);
      jobs.value = result.data;
      hasMore.value = false;
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
      const result = await jobsApi.getAll(nextPage);
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

  return { jobs, loading, loadingMore, searching, error, hasMore, fetchJobs, searchJobs, fetchNextPage, createJob, updateJob, deleteJob, getJob };
});
