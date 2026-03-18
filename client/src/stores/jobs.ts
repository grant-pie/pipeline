import { defineStore } from 'pinia';
import { ref } from 'vue';
import { jobsApi } from '@/api/jobs';
import type { JobApplication, CreateJobDto, UpdateJobDto } from '@/types';

export const useJobsStore = defineStore('jobs', () => {
  const jobs = ref<JobApplication[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchJobs() {
    loading.value = true;
    error.value = null;
    try {
      jobs.value = await jobsApi.getAll();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
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

  return { jobs, loading, error, fetchJobs, createJob, updateJob, deleteJob, getJob };
});
