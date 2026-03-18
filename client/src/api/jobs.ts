import { api } from './client';
import type { JobApplication, CreateJobDto, UpdateJobDto } from '@/types';

export const jobsApi = {
  getAll: () => api.get<JobApplication[]>('/jobs'),
  getOne: (id: string) => api.get<JobApplication>(`/jobs/${id}`),
  create: (dto: CreateJobDto) => api.post<JobApplication>('/jobs', dto),
  update: (id: string, dto: UpdateJobDto) =>
    api.patch<JobApplication>(`/jobs/${id}`, dto),
  delete: (id: string) => api.delete<void>(`/jobs/${id}`),
};
