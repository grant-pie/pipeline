import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminJobs from './AdminJobs.vue';

const mockListJobs = vi.hoisted(() => vi.fn());
const mockDeleteJob = vi.hoisted(() => vi.fn());
const mockBulkDeleteJobs = vi.hoisted(() => vi.fn());

vi.mock('@/api/admin', () => ({
  adminApi: {
    listJobs: mockListJobs,
    deleteJob: mockDeleteJob,
    bulkDeleteJobs: mockBulkDeleteJobs,
  },
}));

function makeJob(overrides = {}) {
  return {
    id: 'job-uuid-1',
    company: 'Acme Corp',
    title: 'Software Engineer',
    status: 'applied',
    dateApplied: '2024-03-01T00:00:00.000Z',
    user: { id: 'user-uuid-1', email: 'alice@example.com' },
    ...overrides,
  };
}

function makeResponse(jobs = [makeJob()], total = 1, hasMore = false) {
  return { data: jobs, total, hasMore };
}

describe('AdminJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  // ── Loading / error / empty ───────────────────────────────────────────────

  it('calls adminApi.listJobs(1, 20, undefined) on mount', async () => {
    mockListJobs.mockResolvedValue(makeResponse());
    mount(AdminJobs);
    await flushPromises();
    expect(mockListJobs).toHaveBeenCalledWith(1, 20, undefined);
  });

  it('renders a loading indicator while the request is in flight', () => {
    mockListJobs.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(AdminJobs);
    expect(wrapper.text()).toContain('Loading');
  });

  it('renders an error message when listJobs() rejects', async () => {
    mockListJobs.mockRejectedValue(new Error('Fetch failed'));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.text()).toContain('Fetch failed');
  });

  it('renders "No jobs found." when response is empty', async () => {
    mockListJobs.mockResolvedValue(makeResponse([], 0));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.text()).toContain('No jobs found.');
  });

  // ── Table rendering ───────────────────────────────────────────────────────

  it('renders one row per job', async () => {
    mockListJobs.mockResolvedValue(
      makeResponse([makeJob(), makeJob({ id: 'job-uuid-2' })], 2),
    );
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  });

  it('renders the company name in each row', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob({ company: 'Globex' })]));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.text()).toContain('Globex');
  });

  it('renders the job title in each row', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob({ title: 'Frontend Dev' })]));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.text()).toContain('Frontend Dev');
  });

  it('renders the status pill with correct class', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob({ status: 'interviewing' })]));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.find('.status-interviewing').exists()).toBe(true);
  });

  it('renders the owner email in each row', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob({ user: { id: 'u1', email: 'bob@example.com' } })]));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.text()).toContain('bob@example.com');
  });

  it('renders "—" when job has no user', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob({ user: null })]));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.text()).toContain('—');
  });

  it('renders the total count label when total > 0', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob()], 77));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.find('.total-label').text()).toContain('77');
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  it('Prev button is disabled on page 1', async () => {
    mockListJobs.mockResolvedValue(makeResponse());
    const wrapper = mount(AdminJobs);
    await flushPromises();
    const prevBtn = wrapper.findAll('button').find((b) => b.text().includes('Prev'));
    expect(prevBtn?.attributes('disabled')).toBeDefined();
  });

  it('Next button is disabled when hasMore is false', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob()], 1, false));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('Next'));
    expect(nextBtn?.attributes('disabled')).toBeDefined();
  });

  it('Next button is enabled when hasMore is true', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob()], 50, true));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('Next'));
    expect(nextBtn?.attributes('disabled')).toBeUndefined();
  });

  it('clicking Next increments page and calls listJobs(2, 20, undefined)', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob()], 50, true));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    mockListJobs.mockResolvedValue(makeResponse([makeJob({ id: 'j2' })], 50, false));
    await wrapper.findAll('button').find((b) => b.text().includes('Next'))!.trigger('click');
    await flushPromises();
    expect(mockListJobs).toHaveBeenCalledWith(2, 20, undefined);
  });

  // ── Search / debounce ─────────────────────────────────────────────────────

  it('does not call API immediately on keystroke', async () => {
    mockListJobs.mockResolvedValue(makeResponse());
    const wrapper = mount(AdminJobs);
    await flushPromises();
    mockListJobs.mockClear();
    await wrapper.find('input[type="search"]').setValue('acme');
    expect(mockListJobs).not.toHaveBeenCalled();
  });

  it('calls listJobs with trimmed search after 300ms debounce', async () => {
    vi.useFakeTimers();
    mockListJobs.mockResolvedValue(makeResponse());
    const wrapper = mount(AdminJobs);
    await flushPromises();
    mockListJobs.mockClear();
    await wrapper.find('input[type="search"]').setValue('  acme  ');
    vi.advanceTimersByTime(300);
    await flushPromises();
    expect(mockListJobs).toHaveBeenCalledWith(1, 20, 'acme');
    vi.useRealTimers();
  });

  it('resets to page 1 when a new search is entered', async () => {
    vi.useFakeTimers();
    mockListJobs.mockResolvedValue(makeResponse([makeJob()], 50, true));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text().includes('Next'))!.trigger('click');
    await flushPromises();
    mockListJobs.mockClear();
    await wrapper.find('input[type="search"]').setValue('globex');
    vi.advanceTimersByTime(300);
    await flushPromises();
    expect(mockListJobs.mock.calls[0][0]).toBe(1);
    vi.useRealTimers();
  });

  // ── Single delete ─────────────────────────────────────────────────────────

  it('calls window.confirm before deleting a job', async () => {
    mockListJobs.mockResolvedValue(makeResponse());
    mockDeleteJob.mockResolvedValue(null);
    const wrapper = mount(AdminJobs);
    await flushPromises();
    await wrapper.find('.btn-danger').trigger('click');
    expect(window.confirm).toHaveBeenCalledTimes(1);
  });

  it('does not call deleteJob when confirm is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    mockListJobs.mockResolvedValue(makeResponse());
    const wrapper = mount(AdminJobs);
    await flushPromises();
    await wrapper.find('.btn-danger').trigger('click');
    await flushPromises();
    expect(mockDeleteJob).not.toHaveBeenCalled();
  });

  it('calls adminApi.deleteJob with correct id', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob({ id: 'job-uuid-1' })]));
    mockDeleteJob.mockResolvedValue(null);
    const wrapper = mount(AdminJobs);
    await flushPromises();
    await wrapper.find('.cell-actions .btn-danger').trigger('click');
    await flushPromises();
    expect(mockDeleteJob).toHaveBeenCalledWith('job-uuid-1');
  });

  it('removes deleted job from the table', async () => {
    mockListJobs.mockResolvedValue(
      makeResponse([makeJob({ id: 'j1' }), makeJob({ id: 'j2', company: 'Globex' })], 2),
    );
    mockDeleteJob.mockResolvedValue(null);
    const wrapper = mount(AdminJobs);
    await flushPromises();
    const deleteButtons = wrapper.findAll('.cell-actions .btn-danger');
    await deleteButtons[0].trigger('click');
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.text()).toContain('Globex');
  });

  it('shows action error when deleteJob rejects', async () => {
    mockListJobs.mockResolvedValue(makeResponse());
    mockDeleteJob.mockRejectedValue(new Error('Delete failed'));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    await wrapper.find('.cell-actions .btn-danger').trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-error').text()).toContain('Delete failed');
  });

  // ── Bulk delete ───────────────────────────────────────────────────────────

  it('does not show bulk actions bar when no rows are selected', async () => {
    mockListJobs.mockResolvedValue(makeResponse());
    const wrapper = mount(AdminJobs);
    await flushPromises();
    expect(wrapper.find('.bulk-actions').exists()).toBe(false);
  });

  it('shows bulk actions bar after checking a row', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob()]));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    await wrapper.find('input[type="checkbox"]').setValue(true);
    expect(wrapper.find('.bulk-actions').exists()).toBe(true);
  });

  it('shows selected count in bulk actions bar', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob({ id: 'j1' }), makeJob({ id: 'j2' })]));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0].setValue(true);
    await checkboxes[1].setValue(true);
    expect(wrapper.find('.selected-count').text()).toContain('2');
  });

  it('calls adminApi.bulkDeleteJobs with selected ids', async () => {
    mockListJobs.mockResolvedValue(
      makeResponse([makeJob({ id: 'j1' }), makeJob({ id: 'j2' })], 2),
    );
    mockBulkDeleteJobs.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminJobs);
    await flushPromises();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0].setValue(true);
    await checkboxes[1].setValue(true);
    const bulkDeleteBtn = wrapper.find('.bulk-actions .btn-danger');
    await bulkDeleteBtn.trigger('click');
    await flushPromises();
    expect(mockBulkDeleteJobs).toHaveBeenCalledWith(['j1', 'j2']);
  });

  it('removes bulk-deleted jobs from the table', async () => {
    mockListJobs.mockResolvedValue(
      makeResponse([makeJob({ id: 'j1' }), makeJob({ id: 'j2', company: 'Globex' })], 2),
    );
    mockBulkDeleteJobs.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminJobs);
    await flushPromises();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0].setValue(true);
    await wrapper.find('.bulk-actions .btn-danger').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.text()).toContain('Globex');
  });

  it('clears selection and hides bulk bar after bulk delete succeeds', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob({ id: 'j1' }), makeJob({ id: 'j2' })], 2));
    mockBulkDeleteJobs.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminJobs);
    await flushPromises();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0].setValue(true);
    await wrapper.find('.bulk-actions .btn-danger').trigger('click');
    await flushPromises();
    expect(wrapper.find('.bulk-actions').exists()).toBe(false);
  });

  it('"Clear" button in bulk actions clears the selection', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob()]));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    await wrapper.find('input[type="checkbox"]').setValue(true);
    expect(wrapper.find('.bulk-actions').exists()).toBe(true);
    const clearBtn = wrapper.findAll('.bulk-actions button').find((b) => b.text() === 'Clear')!;
    await clearBtn.trigger('click');
    expect(wrapper.find('.bulk-actions').exists()).toBe(false);
  });

  it('does not call bulkDeleteJobs when confirm is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    mockListJobs.mockResolvedValue(makeResponse([makeJob()]));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('.bulk-actions .btn-danger').trigger('click');
    await flushPromises();
    expect(mockBulkDeleteJobs).not.toHaveBeenCalled();
  });

  it('shows action error when bulkDeleteJobs rejects', async () => {
    mockListJobs.mockResolvedValue(makeResponse([makeJob()]));
    mockBulkDeleteJobs.mockRejectedValue(new Error('Bulk delete failed'));
    const wrapper = mount(AdminJobs);
    await flushPromises();
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('.bulk-actions .btn-danger').trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-error').text()).toContain('Bulk delete failed');
  });
});
