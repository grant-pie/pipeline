import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useJobsStore } from './jobs';
import type { JobApplication } from '@/types';

const mockJobs: JobApplication[] = [
  {
    id: 'job-1',
    company: 'Acme Corp',
    title: 'Frontend Developer',
    dateApplied: '2026-03-01',
    status: 'applied',
    userId: 'user-1',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'job-2',
    company: 'Globex',
    title: 'Vue Engineer',
    dateApplied: '2026-03-10',
    status: 'interviewing',
    userId: 'user-1',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
  },
];

// Factory cannot reference mockJobs — vi.mock is hoisted before variable declarations.
// Return values are set in beforeEach instead.
vi.mock('@/api/jobs', () => ({
  jobsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useJobsStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    const { jobsApi } = await import('@/api/jobs');
    vi.mocked(jobsApi.getAll).mockResolvedValue([...mockJobs]);
    vi.mocked(jobsApi.create).mockResolvedValue({ ...mockJobs[0], id: 'job-3' });
    vi.mocked(jobsApi.delete).mockResolvedValue(undefined as never);
  });

  it('starts with an empty jobs list', () => {
    const store = useJobsStore();
    expect(store.jobs).toHaveLength(0);
  });

  it('populates jobs after fetchJobs', async () => {
    const store = useJobsStore();
    await store.fetchJobs();
    expect(store.jobs).toHaveLength(2);
  });

  it('sets loading to true while fetching and false when done', async () => {
    const store = useJobsStore();
    const promise = store.fetchJobs();
    expect(store.loading).toBe(true);
    await promise;
    expect(store.loading).toBe(false);
  });

  it('removes the correct job after deleteJob', async () => {
    const store = useJobsStore();
    await store.fetchJobs();
    await store.deleteJob('job-1');
    expect(store.jobs.find((j) => j.id === 'job-1')).toBeUndefined();
    expect(store.jobs).toHaveLength(1);
  });

  it('does not remove the wrong job when deleting', async () => {
    const store = useJobsStore();
    await store.fetchJobs();
    await store.deleteJob('job-1');
    expect(store.jobs.find((j) => j.id === 'job-2')).toBeDefined();
  });

  it('adds a new job to the front of the list after createJob', async () => {
    const store = useJobsStore();
    await store.fetchJobs();
    await store.createJob({
      company: 'New Co',
      title: 'New Role',
      dateApplied: '2026-03-20',
      status: 'applied',
    });
    expect(store.jobs[0].id).toBe('job-3');
    expect(store.jobs).toHaveLength(3);
  });

  it('returns a job by id with getJob', async () => {
    const store = useJobsStore();
    await store.fetchJobs();
    const job = store.getJob('job-2');
    expect(job?.company).toBe('Globex');
  });

  it('returns null for a job id that does not exist', async () => {
    const store = useJobsStore();
    await store.fetchJobs();
    expect(store.getJob('nonexistent')).toBeNull();
  });

  it('loading starts as false', () => {
    const store = useJobsStore();
    expect(store.loading).toBe(false);
  });

  it('error starts as null', () => {
    const store = useJobsStore();
    expect(store.error).toBeNull();
  });

  it('fetchJobs() sets error when the API throws', async () => {
    const { jobsApi } = await import('@/api/jobs');
    vi.mocked(jobsApi.getAll).mockRejectedValueOnce(new Error('Network error'));
    const store = useJobsStore();
    await store.fetchJobs();
    expect(store.error).toBe('Network error');
  });

  it('fetchJobs() clears a previous error on retry', async () => {
    const { jobsApi } = await import('@/api/jobs');
    vi.mocked(jobsApi.getAll).mockRejectedValueOnce(new Error('First failure'));
    const store = useJobsStore();
    await store.fetchJobs();
    expect(store.error).toBe('First failure');

    vi.mocked(jobsApi.getAll).mockResolvedValueOnce([...mockJobs]);
    await store.fetchJobs();
    expect(store.error).toBeNull();
  });

  it('updateJob() calls the API and updates the job in the array in-place', async () => {
    const { jobsApi } = await import('@/api/jobs');
    const updated = { ...mockJobs[0], status: 'interviewing' as const };
    vi.mocked(jobsApi.update).mockResolvedValueOnce(updated);

    const store = useJobsStore();
    await store.fetchJobs();
    await store.updateJob('job-1', { status: 'interviewing' });

    expect(jobsApi.update).toHaveBeenCalledWith('job-1', { status: 'interviewing' });
    expect(store.jobs.find((j) => j.id === 'job-1')?.status).toBe('interviewing');
  });

  it('updateJob() returns the updated job', async () => {
    const { jobsApi } = await import('@/api/jobs');
    const updated = { ...mockJobs[0], status: 'offered' as const };
    vi.mocked(jobsApi.update).mockResolvedValueOnce(updated);

    const store = useJobsStore();
    await store.fetchJobs();
    const result = await store.updateJob('job-1', { status: 'offered' });

    expect(result.status).toBe('offered');
  });
});
