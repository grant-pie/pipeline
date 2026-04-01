import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DashboardView from './DashboardView.vue';
import type { JobApplication } from '@/types';

const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
  JobCard: {
    props: ['job'],
    template: '<div class="job-card-stub" :data-id="job.id" @click="$emit(\'delete\', job.id)"></div>',
    emits: ['delete'],
  },
};

const makeJob = (overrides: Partial<JobApplication> = {}): JobApplication => ({
  id: 'job-1',
  company: 'Acme',
  title: 'Frontend Engineer',
  dateApplied: '2026-03-20',
  status: 'applied',
  userId: 'user-1',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
  ...overrides,
});

const fetchJobs = vi.fn();
const fetchNextPage = vi.fn();
const searchJobs = vi.fn();
const deleteJob = vi.fn();

// Mutable store state shared across tests
let storeState = {
  jobs: [] as JobApplication[],
  loading: false,
  loadingMore: false,
  searching: false,
  error: null as string | null,
  hasMore: false,
  fetchJobs,
  fetchNextPage,
  searchJobs,
  deleteJob,
};

vi.mock('@/stores/jobs', () => ({
  useJobsStore: () => storeState,
}));

// Stub IntersectionObserver (not available in jsdom)
const observeMock = vi.fn();
const disconnectMock = vi.fn();
vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
  observe: observeMock,
  disconnect: disconnectMock,
})));

describe('DashboardView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
    storeState = { jobs: [], loading: false, loadingMore: false, searching: false, error: null, hasMore: false, fetchJobs, fetchNextPage, searchJobs, deleteJob };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Mount behaviour ────────────────────────────────────────────────────

  it('calls fetchJobs on mount', () => {
    mount(DashboardView, { global: { stubs } });
    expect(fetchJobs).toHaveBeenCalledTimes(1);
  });

  // ── Loading / error / empty states ─────────────────────────────────────

  it('shows loading indicator when store.loading is true', () => {
    storeState.loading = true;
    const wrapper = mount(DashboardView, { global: { stubs } });
    expect(wrapper.text()).toContain('Loading');
  });

  it('shows error message when store.error is set', () => {
    storeState.error = 'Failed to load jobs';
    const wrapper = mount(DashboardView, { global: { stubs } });
    expect(wrapper.text()).toContain('Failed to load jobs');
  });

  it('shows empty state when jobs array is empty', () => {
    storeState.jobs = [];
    const wrapper = mount(DashboardView, { global: { stubs } });
    expect(wrapper.text()).toContain('No applications yet');
  });

  it('does not show empty state when there are jobs', () => {
    storeState.jobs = [makeJob()];
    const wrapper = mount(DashboardView, { global: { stubs } });
    expect(wrapper.text()).not.toContain('No applications yet');
  });

  // ── Search ─────────────────────────────────────────────────────────────

  it('calls searchJobs after debounce when search input has a value', async () => {
    const wrapper = mount(DashboardView, { global: { stubs } });
    await wrapper.find('.search-input').setValue('acme');
    expect(searchJobs).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(searchJobs).toHaveBeenCalledWith('acme');
  });

  it('calls fetchJobs after debounce when search is cleared', async () => {
    const wrapper = mount(DashboardView, { global: { stubs } });
    await wrapper.find('.search-input').setValue('acme');
    vi.advanceTimersByTime(300);
    await wrapper.find('.search-input').setValue('');
    vi.advanceTimersByTime(300);
    expect(fetchJobs).toHaveBeenCalledTimes(2); // once on mount, once on clear
  });

  it('does not call searchJobs before the debounce delay', async () => {
    const wrapper = mount(DashboardView, { global: { stubs } });
    await wrapper.find('.search-input').setValue('acme');
    vi.advanceTimersByTime(299);
    expect(searchJobs).not.toHaveBeenCalled();
  });

  it('shows no-results message when jobs is empty and search has a value', async () => {
    storeState.jobs = [];
    const wrapper = mount(DashboardView, { global: { stubs } });
    // simulate search returning empty results
    storeState.jobs = [];
    await wrapper.find('.search-input').setValue('zzz');
    vi.advanceTimersByTime(300);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('No results');
  });

  it('status filter still applies to search results', async () => {
    storeState.jobs = [
      makeJob({ id: 'job-1', company: 'Acme', status: 'applied' }),
      makeJob({ id: 'job-2', company: 'Acme', status: 'rejected' }),
    ];
    const wrapper = mount(DashboardView, { global: { stubs } });
    const appliedBtn = wrapper.findAll('.filter-btn').find((b) => b.text().includes('Applied'));
    await appliedBtn!.trigger('click');
    expect(wrapper.findAll('.job-card-stub')).toHaveLength(1);
    expect(wrapper.find('.job-card-stub').attributes('data-id')).toBe('job-1');
  });

  // ── Job list rendering ─────────────────────────────────────────────────

  it('renders a JobCard for each job', () => {
    storeState.jobs = [makeJob({ id: 'job-1' }), makeJob({ id: 'job-2' })];
    const wrapper = mount(DashboardView, { global: { stubs } });
    expect(wrapper.findAll('.job-card-stub')).toHaveLength(2);
  });

  // ── Filter buttons ─────────────────────────────────────────────────────

  it('renders all 5 filter buttons', () => {
    const wrapper = mount(DashboardView, { global: { stubs } });
    const buttons = wrapper.findAll('.filter-btn');
    expect(buttons).toHaveLength(5);
    const labels = buttons.map((b) => b.text());
    expect(labels.some((l) => l.includes('All'))).toBe(true);
    expect(labels.some((l) => l.includes('Applied'))).toBe(true);
    expect(labels.some((l) => l.includes('Interviewing'))).toBe(true);
    expect(labels.some((l) => l.includes('Offered'))).toBe(true);
    expect(labels.some((l) => l.includes('Rejected'))).toBe(true);
  });

  it('"All" filter is active by default', () => {
    const wrapper = mount(DashboardView, { global: { stubs } });
    expect(wrapper.find('.filter-btn.active').text()).toContain('All');
  });

  it('clicking a status filter shows only matching jobs', async () => {
    storeState.jobs = [
      makeJob({ id: 'job-1', status: 'applied' }),
      makeJob({ id: 'job-2', status: 'interviewing' }),
      makeJob({ id: 'job-3', status: 'applied' }),
    ];
    const wrapper = mount(DashboardView, { global: { stubs } });

    const appliedBtn = wrapper.findAll('.filter-btn').find((b) => b.text().includes('Applied'));
    await appliedBtn!.trigger('click');

    expect(wrapper.findAll('.job-card-stub')).toHaveLength(2);
  });

  it('filter count reflects the number of jobs per status', () => {
    storeState.jobs = [
      makeJob({ id: 'job-1', status: 'applied' }),
      makeJob({ id: 'job-2', status: 'applied' }),
      makeJob({ id: 'job-3', status: 'offered' }),
    ];
    const wrapper = mount(DashboardView, { global: { stubs } });
    const allBtn = wrapper.find('.filter-btn');
    expect(allBtn.find('.filter-count').text()).toBe('3');
  });

  it('clicking a filter button marks it as active', async () => {
    const wrapper = mount(DashboardView, { global: { stubs } });
    const buttons = wrapper.findAll('.filter-btn');
    await buttons[1].trigger('click'); // Applied
    expect(buttons[1].classes()).toContain('active');
    expect(buttons[0].classes()).not.toContain('active');
  });

  // ── Delete flow ────────────────────────────────────────────────────────

  it('calls deleteJob with the correct id when confirmed', async () => {
    storeState.jobs = [makeJob({ id: 'job-1' })];
    deleteJob.mockResolvedValue(undefined);
    const wrapper = mount(DashboardView, { global: { stubs } });

    await wrapper.find('.job-card-stub').trigger('click');
    await flushPromises();

    expect(deleteJob).toHaveBeenCalledWith('job-1');
  });

  it('does not call deleteJob when the user cancels the confirm dialog', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    storeState.jobs = [makeJob({ id: 'job-1' })];
    const wrapper = mount(DashboardView, { global: { stubs } });

    await wrapper.find('.job-card-stub').trigger('click');
    await flushPromises();

    expect(deleteJob).not.toHaveBeenCalled();
  });

  it('shows a delete error when the delete action fails', async () => {
    storeState.jobs = [makeJob({ id: 'job-1' })];
    deleteJob.mockRejectedValue(new Error('Delete failed'));
    const wrapper = mount(DashboardView, { global: { stubs } });

    await wrapper.find('.job-card-stub').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Delete failed');
  });
});
