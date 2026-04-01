import { api } from './client';
import type { JobApplication, CreateJobDto, UpdateJobDto } from '@/types';

export interface PaginatedJobs {
  data: JobApplication[];
  total: number;
  hasMore: boolean;
}

export const jobsApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<PaginatedJobs>(`/jobs?page=${page}&limit=${limit}`),
  search: (query: string) =>
    api.get<PaginatedJobs>(`/jobs?search=${encodeURIComponent(query)}`),
  getOne: (id: string) => api.get<JobApplication>(`/jobs/${id}`),
  create: (dto: CreateJobDto) => api.post<JobApplication>('/jobs', dto),
  update: (id: string, dto: UpdateJobDto) =>
    api.patch<JobApplication>(`/jobs/${id}`, dto),
  delete: (id: string) => api.delete<void>(`/jobs/${id}`),
};
