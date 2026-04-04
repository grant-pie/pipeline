import { api } from './client';
import type { JobApplication, CreateJobDto, UpdateJobDto } from '@/types';

export interface PaginatedJobs {
  data: JobApplication[];
  total: number;
  hasMore: boolean;
  statusCounts: Record<string, number>;
}

export const jobsApi = {
  getAll: (page = 1, limit = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return api.get<PaginatedJobs>(`/jobs?${params}`);
  },
  search: (query: string, status?: string) => {
    const params = new URLSearchParams({ search: query });
    if (status) params.set('status', status);
    return api.get<PaginatedJobs>(`/jobs?${params}`);
  },
  getOne: (id: string) => api.get<JobApplication>(`/jobs/${id}`),
  create: (dto: CreateJobDto) => api.post<JobApplication>('/jobs', dto),
  update: (id: string, dto: UpdateJobDto) =>
    api.patch<JobApplication>(`/jobs/${id}`, dto),
  delete: (id: string) => api.delete<void>(`/jobs/${id}`),
};
