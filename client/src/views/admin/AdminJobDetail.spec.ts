import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminJobDetail from './AdminJobDetail.vue';

const mockGetJob = vi.hoisted(() => vi.fn());
const mockUpdateJob = vi.hoisted(() => vi.fn());
const mockDeleteJob = vi.hoisted(() => vi.fn());

vi.mock('@/api/admin', () => ({
  adminApi: {
    getJob: mockGetJob,
    updateJob: mockUpdateJob,
    deleteJob: mockDeleteJob,
  },
}));

const mockPush = vi.fn();

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => ({ params: { id: 'job-uuid-1' } }),
    useRouter: () => ({ push: mockPush }),
  };
});

const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
};

function makeJob(overrides = {}) {
  return {
    id: 'job-uuid-1',
    company: 'Acme Corp',
    title: 'Software Engineer',
    status: 'applied',
    dateApplied: '2026-03-01T00:00:00.000Z',
    link: 'https://acme.com/jobs/1',
    notes: 'Applied online',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
    user: { id: 'user-1', email: 'alice@example.com' },
    ...overrides,
  };
}

describe('AdminJobDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  // ── Loading / error ───────────────────────────────────────────────────────

  it('renders a loading indicator while the request is in flight', () => {
    mockGetJob.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    expect(wrapper.text()).toContain('Loading');
  });

  it('renders an error message when getJob() rejects', async () => {
    mockGetJob.mockRejectedValue(new Error('Job not found'));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Job not found');
  });

  it('calls adminApi.getJob with the route id on mount', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    expect(mockGetJob).toHaveBeenCalledWith('job-uuid-1');
  });

  // ── Read view ─────────────────────────────────────────────────────────────

  it('renders company name as the page title', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('h1').text()).toContain('Acme Corp');
  });

  it('renders the job title in the meta row', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.job-title-sub').text()).toBe('Software Engineer');
  });

  it('applies the correct status-pill class for each status', async () => {
    for (const status of ['applied', 'interviewing', 'offered', 'rejected'] as const) {
      mockGetJob.mockResolvedValue(makeJob({ status }));
      const wrapper = mount(AdminJobDetail, { global: { stubs } });
      await flushPromises();
      const pills = wrapper.findAll('.status-pill');
      expect(pills.some((p) => p.classes().includes(`status-${status}`))).toBe(true);
    }
  });

  it('renders the job link as an anchor when link is present', async () => {
    mockGetJob.mockResolvedValue(makeJob({ link: 'https://acme.com/jobs/1' }));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    const link = wrapper.find('.ext-link');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('https://acme.com/jobs/1');
  });

  it('renders a muted dash when job has no link', async () => {
    mockGetJob.mockResolvedValue(makeJob({ link: null }));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.ext-link').exists()).toBe(false);
    expect(wrapper.text()).toContain('—');
  });

  it('renders notes when present', async () => {
    mockGetJob.mockResolvedValue(makeJob({ notes: 'Great company' }));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Great company');
  });

  it('renders a muted dash when notes are absent', async () => {
    mockGetJob.mockResolvedValue(makeJob({ notes: null }));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('—');
  });

  it('renders owner email', async () => {
    mockGetJob.mockResolvedValue(makeJob({ user: { id: 'user-1', email: 'alice@example.com' } }));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('alice@example.com');
  });

  it('renders a muted dash for owner when user is null', async () => {
    mockGetJob.mockResolvedValue(makeJob({ user: null }));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('—');
  });

  // ── Edit mode ─────────────────────────────────────────────────────────────

  it('shows edit form when Edit button is clicked', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Edit')!.trigger('click');
    expect(wrapper.find('.edit-form').exists()).toBe(true);
    expect(wrapper.find('.detail-grid').exists()).toBe(false);
  });

  it('pre-fills draft inputs with the current job values on edit', async () => {
    mockGetJob.mockResolvedValue(makeJob({ company: 'Acme Corp', title: 'Software Engineer' }));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Edit')!.trigger('click');
    const inputs = wrapper.findAll('input');
    const companyInput = inputs.find((i) => (i.element as HTMLInputElement).value === 'Acme Corp');
    expect(companyInput).toBeDefined();
    const titleInput = inputs.find((i) => (i.element as HTMLInputElement).value === 'Software Engineer');
    expect(titleInput).toBeDefined();
  });

  it('Cancel button returns to read view without saving', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Edit')!.trigger('click');
    await wrapper.findAll('button').find((b) => b.text() === 'Cancel')!.trigger('click');
    expect(wrapper.find('.detail-grid').exists()).toBe(true);
    expect(wrapper.find('.edit-form').exists()).toBe(false);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it('Save changes calls adminApi.updateJob with the correct payload', async () => {
    mockGetJob.mockResolvedValue(makeJob({ company: 'Acme Corp', title: 'SWE', status: 'applied', dateApplied: '2026-03-01T00:00:00.000Z', link: 'https://acme.com', notes: 'note' }));
    mockUpdateJob.mockResolvedValue(makeJob());
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Edit')!.trigger('click');
    await wrapper.findAll('button').find((b) => b.text() === 'Save changes')!.trigger('click');
    await flushPromises();
    expect(mockUpdateJob).toHaveBeenCalledWith('job-uuid-1', expect.objectContaining({
      company: 'Acme Corp',
      title: 'SWE',
      status: 'applied',
    }));
  });

  it('Save changes sends undefined for empty link and notes', async () => {
    mockGetJob.mockResolvedValue(makeJob({ link: null, notes: null }));
    mockUpdateJob.mockResolvedValue(makeJob());
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Edit')!.trigger('click');
    await wrapper.findAll('button').find((b) => b.text() === 'Save changes')!.trigger('click');
    await flushPromises();
    const payload = mockUpdateJob.mock.calls[0][1];
    expect(payload.link).toBeUndefined();
    expect(payload.notes).toBeUndefined();
  });

  it('Save success returns to read view and shows success message', async () => {
    const updated = makeJob({ company: 'New Corp' });
    mockGetJob.mockResolvedValue(makeJob());
    mockUpdateJob.mockResolvedValue(updated);
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Edit')!.trigger('click');
    await wrapper.findAll('button').find((b) => b.text() === 'Save changes')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('.detail-grid').exists()).toBe(true);
    expect(wrapper.find('.action-msg').text()).toContain('Job updated');
  });

  it('Save error shows an error message and stays in edit view', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    mockUpdateJob.mockRejectedValue(new Error('Validation failed'));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Edit')!.trigger('click');
    await wrapper.findAll('button').find((b) => b.text() === 'Save changes')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-msg').text()).toContain('Validation failed');
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  it('Delete button triggers a confirm dialog', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    mockDeleteJob.mockResolvedValue(null);
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.find('.btn-danger').trigger('click');
    expect(window.confirm).toHaveBeenCalledTimes(1);
  });

  it('does not call deleteJob when confirm is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    mockGetJob.mockResolvedValue(makeJob());
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.find('.btn-danger').trigger('click');
    await flushPromises();
    expect(mockDeleteJob).not.toHaveBeenCalled();
  });

  it('calls adminApi.deleteJob with the job id when confirmed', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    mockDeleteJob.mockResolvedValue(null);
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.find('.btn-danger').trigger('click');
    await flushPromises();
    expect(mockDeleteJob).toHaveBeenCalledWith('job-uuid-1');
  });

  it('navigates to admin-jobs after successful delete', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    mockDeleteJob.mockResolvedValue(null);
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.find('.btn-danger').trigger('click');
    await flushPromises();
    expect(mockPush).toHaveBeenCalledWith({ name: 'admin-jobs' });
  });

  it('shows an error message when deleteJob rejects', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    mockDeleteJob.mockRejectedValue(new Error('Delete failed'));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.find('.btn-danger').trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-msg').text()).toContain('Delete failed');
  });

  it('does not navigate away when deleteJob rejects', async () => {
    mockGetJob.mockResolvedValue(makeJob());
    mockDeleteJob.mockRejectedValue(new Error('Delete failed'));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.find('.btn-danger').trigger('click');
    await flushPromises();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── Action message auto-dismiss ───────────────────────────────────────────

  it('action message disappears after 4 seconds', async () => {
    vi.useFakeTimers();
    mockGetJob.mockResolvedValue(makeJob());
    mockDeleteJob.mockRejectedValue(new Error('Delete failed'));
    const wrapper = mount(AdminJobDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.find('.btn-danger').trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-msg').exists()).toBe(true);
    vi.advanceTimersByTime(4000);
    await flushPromises();
    expect(wrapper.find('.action-msg').exists()).toBe(false);
    vi.useRealTimers();
  });
});
