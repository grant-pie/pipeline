import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreateJobDto } from '@/types';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('./client', () => ({
  api: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete },
}));

describe('jobsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll() calls api.get with page and limit query params', async () => {
    mockGet.mockResolvedValue({ data: [], total: 0, hasMore: false });
    const { jobsApi } = await import('./jobs');
    await jobsApi.getAll(1, 20);
    expect(mockGet).toHaveBeenCalledWith('/jobs?page=1&limit=20');
  });

  it('getOne(id) calls api.get with the correct job path', async () => {
    mockGet.mockResolvedValue({});
    const { jobsApi } = await import('./jobs');
    await jobsApi.getOne('job-abc');
    expect(mockGet).toHaveBeenCalledWith('/jobs/job-abc');
  });

  it('create(dto) calls api.post with the correct path and dto', async () => {
    const dto: CreateJobDto = {
      company: 'Acme',
      title: 'Engineer',
      dateApplied: '2026-01-01',
      status: 'applied',
    };
    mockPost.mockResolvedValue({ ...dto, id: 'new-id' });
    const { jobsApi } = await import('./jobs');
    await jobsApi.create(dto);
    expect(mockPost).toHaveBeenCalledWith('/jobs', dto);
  });

  it('update(id, dto) calls api.patch with the correct path and dto', async () => {
    const dto = { status: 'interviewing' as const };
    mockPatch.mockResolvedValue({});
    const { jobsApi } = await import('./jobs');
    await jobsApi.update('job-abc', dto);
    expect(mockPatch).toHaveBeenCalledWith('/jobs/job-abc', dto);
  });

  it('delete(id) calls api.delete with the correct path', async () => {
    mockDelete.mockResolvedValue(null);
    const { jobsApi } = await import('./jobs');
    await jobsApi.delete('job-abc');
    expect(mockDelete).toHaveBeenCalledWith('/jobs/job-abc');
  });
});
