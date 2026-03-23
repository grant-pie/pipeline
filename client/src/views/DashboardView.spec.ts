import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DashboardView from './DashboardView.vue';
import type { JobApplication } from '@/types';

const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
  JobCard: { template: '<div class="job-card-stub" @click="$emit(\'delete\', \'job-1\')"></div>' },
};

const jobs: JobApplication[] = [
  {
    id: 'job-1',
    company: 'Acme',
    title: 'Frontend Engineer',
    dateApplied: '2026-03-20',
    status: 'applied',
    userId: 'user-1',
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
  },
];

const fetchJobs = vi.fn();
const deleteJob = vi.fn();

vi.mock('@/stores/jobs', () => ({
  useJobsStore: () => ({
    jobs,
    loading: false,
    error: null,
    fetchJobs,
    deleteJob,
  }),
}));

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('shows a delete error when delete action fails', async () => {
    deleteJob.mockRejectedValueOnce(new Error('Delete failed'));
    const wrapper = mount(DashboardView, { global: { stubs } });

    await wrapper.find('.job-card-stub').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Delete failed');
  });
});
