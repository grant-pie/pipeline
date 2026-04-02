import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminAuditLog from './AdminAuditLog.vue';

const mockGetAuditLog = vi.hoisted(() => vi.fn());

vi.mock('@/api/admin', () => ({
  adminApi: { getAuditLog: mockGetAuditLog },
}));

function makeEntry(overrides = {}) {
  return {
    id: 'log-uuid-1',
    adminId: 'admin-uuid-1',
    adminEmail: 'admin@example.com',
    action: 'DELETE_USER',
    targetType: 'user',
    targetId: 'abcdef1234567890',
    metadata: { targetEmail: 'victim@example.com' },
    createdAt: '2024-06-15T14:30:00.000Z',
    ...overrides,
  };
}

function makeResponse(entries = [makeEntry()], total = 1, hasMore = false) {
  return { data: entries, total, hasMore };
}

describe('AdminAuditLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls adminApi.getAuditLog(1, 50) on mount', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse());
    mount(AdminAuditLog);
    await flushPromises();
    expect(mockGetAuditLog).toHaveBeenCalledWith(1, 50);
  });

  it('renders a loading indicator while the request is in flight', () => {
    mockGetAuditLog.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(AdminAuditLog);
    expect(wrapper.text()).toContain('Loading');
  });

  it('renders an error message when getAuditLog() rejects', async () => {
    mockGetAuditLog.mockRejectedValue(new Error('Fetch failed'));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('Fetch failed');
  });

  it('renders "No audit log entries yet." when response is empty', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([], 0));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('No audit log entries yet.');
  });

  it('renders one row per entry', async () => {
    mockGetAuditLog.mockResolvedValue(
      makeResponse([makeEntry(), makeEntry({ id: 'log-uuid-2' })], 2),
    );
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  });

  it('renders the admin email in each row', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ adminEmail: 'boss@example.com' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('boss@example.com');
  });

  it('renders human-readable label for DELETE_USER', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'DELETE_USER' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('Deleted user');
  });

  it('renders human-readable label for SET_ROLE', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'SET_ROLE' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('Set role');
  });

  it('renders human-readable label for SUSPEND_USER', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'SUSPEND_USER' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('Suspended');
  });

  it('renders human-readable label for BULK_DELETE_JOBS', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'BULK_DELETE_JOBS', targetType: 'job', targetId: null })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('Bulk deleted jobs');
  });

  it('renders the target type', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ targetType: 'user' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('user');
  });

  it('renders abbreviated targetId (first 8 chars + ellipsis)', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ targetId: 'abcdef1234567890' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('abcdef12');
    expect(wrapper.text()).toContain('…');
  });

  it('renders targetEmail from metadata as the detail', async () => {
    mockGetAuditLog.mockResolvedValue(
      makeResponse([makeEntry({ metadata: { targetEmail: 'victim@example.com' } })]),
    );
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('victim@example.com');
  });

  it('renders "company — title" when metadata has both fields', async () => {
    mockGetAuditLog.mockResolvedValue(
      makeResponse([makeEntry({ action: 'DELETE_JOB', targetType: 'job', metadata: { company: 'Acme', title: 'Dev' } })]),
    );
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('Acme — Dev');
  });

  it('renders job count from metadata.count when only count is present', async () => {
    mockGetAuditLog.mockResolvedValue(
      makeResponse([makeEntry({ action: 'BULK_DELETE_JOBS', targetType: 'job', targetId: null, metadata: { count: 7, ids: [] } })]),
    );
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.text()).toContain('7 jobs');
  });

  it('renders "—" in the detail column when metadata is absent', async () => {
    mockGetAuditLog.mockResolvedValue(
      makeResponse([makeEntry({ metadata: undefined })]),
    );
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.findAll('.cell-meta').some((el) => el.text() === '—')).toBe(true);
  });

  it('applies action-danger class to DELETE_USER action tag', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'DELETE_USER' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.find('.action-tag').classes()).toContain('action-danger');
  });

  it('applies action-danger class to SUSPEND_USER action tag', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'SUSPEND_USER' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.find('.action-tag').classes()).toContain('action-danger');
  });

  it('applies action-danger class to DELETE_JOB action tag', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'DELETE_JOB', targetType: 'job' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.find('.action-tag').classes()).toContain('action-danger');
  });

  it('applies action-danger class to BULK_DELETE_JOBS action tag', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'BULK_DELETE_JOBS', targetType: 'job', targetId: null })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.find('.action-tag').classes()).toContain('action-danger');
  });

  it('applies action-warn class to SET_ROLE action tag', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'SET_ROLE' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.find('.action-tag').classes()).toContain('action-warn');
  });

  it('applies action-warn class to TRIGGER_PASSWORD_RESET action tag', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'TRIGGER_PASSWORD_RESET' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.find('.action-tag').classes()).toContain('action-warn');
  });

  it('applies action-neutral class to FORCE_VERIFY action tag', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'FORCE_VERIFY' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.find('.action-tag').classes()).toContain('action-neutral');
  });

  it('applies action-neutral class to UNSUSPEND_USER action tag', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ action: 'UNSUSPEND_USER' })]));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.find('.action-tag').classes()).toContain('action-neutral');
  });

  it('renders the total entry count label when total > 0', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry()], 99));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    expect(wrapper.find('.total-label').text()).toContain('99');
  });

  it('Prev button is disabled on page 1', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse());
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    const prevBtn = wrapper.findAll('button').find((b) => b.text().includes('Prev'));
    expect(prevBtn?.attributes('disabled')).toBeDefined();
  });

  it('Next button is disabled when hasMore is false', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry()], 1, false));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('Next'));
    expect(nextBtn?.attributes('disabled')).toBeDefined();
  });

  it('clicking Next increments page and calls getAuditLog(2, 50)', async () => {
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry()], 100, true));
    const wrapper = mount(AdminAuditLog);
    await flushPromises();
    mockGetAuditLog.mockResolvedValue(makeResponse([makeEntry({ id: 'l2' })], 100, false));
    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('Next'))!;
    await nextBtn.trigger('click');
    await flushPromises();
    expect(mockGetAuditLog).toHaveBeenCalledWith(2, 50);
  });
});
