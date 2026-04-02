import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminDashboard from './AdminDashboard.vue';

const mockGetStats = vi.fn();

vi.mock('@/api/admin', () => ({
  adminApi: { getStats: mockGetStats },
}));

const stubs = { RouterLink: { template: '<a><slot /></a>' } };

const makeStats = (overrides = {}) => ({
  users: { total: 100, verified: 80, suspended: 3, admins: 2 },
  jobs: { total: 250, byStatus: { applied: 120, interviewing: 60, offered: 40, rejected: 30 } },
  ...overrides,
});

describe('AdminDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a loading indicator while the request is in flight', () => {
    mockGetStats.mockReturnValue(new Promise(() => {})); // never resolves
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    expect(wrapper.text()).toContain('Loading');
  });

  it('calls adminApi.getStats() once on mount', async () => {
    mockGetStats.mockResolvedValue(makeStats());
    mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    expect(mockGetStats).toHaveBeenCalledTimes(1);
  });

  it('renders an error message when getStats() rejects', async () => {
    mockGetStats.mockRejectedValue(new Error('Server error'));
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Server error');
  });

  it('does not render stat cards on error', async () => {
    mockGetStats.mockRejectedValue(new Error('fail'));
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    expect(wrapper.findAll('.stat-card')).toHaveLength(0);
  });

  it('renders the correct total user count', async () => {
    mockGetStats.mockResolvedValue(makeStats());
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('100');
  });

  it('renders the correct verified user count', async () => {
    mockGetStats.mockResolvedValue(makeStats());
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('80');
  });

  it('renders the correct suspended user count', async () => {
    mockGetStats.mockResolvedValue(makeStats());
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('3');
  });

  it('applies text-danger class to suspended count when > 0', async () => {
    mockGetStats.mockResolvedValue(makeStats());
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    const suspendedEl = wrapper.findAll('.stat-value').find((el) => el.text() === '3');
    expect(suspendedEl?.classes()).toContain('text-danger');
  });

  it('does NOT apply text-danger class when suspended count is 0', async () => {
    mockGetStats.mockResolvedValue(
      makeStats({ users: { total: 10, verified: 10, suspended: 0, admins: 1 } }),
    );
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    const suspendedEl = wrapper.findAll('.stat-value').find((el) => el.text() === '0');
    expect(suspendedEl?.classes()).not.toContain('text-danger');
  });

  it('renders the correct total job count', async () => {
    mockGetStats.mockResolvedValue(makeStats());
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('250');
  });

  it('renders each status count', async () => {
    mockGetStats.mockResolvedValue(makeStats());
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('120'); // applied
    expect(wrapper.text()).toContain('60');  // interviewing
    expect(wrapper.text()).toContain('40');  // offered
    expect(wrapper.text()).toContain('30');  // rejected
  });

  it('renders 0 for a status not present in byStatus', async () => {
    mockGetStats.mockResolvedValue(
      makeStats({ jobs: { total: 5, byStatus: {} } }),
    );
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    // All four status cards should show 0
    const statValues = wrapper.findAll('.stat-value').map((el) => el.text());
    expect(statValues.filter((v) => v === '0').length).toBeGreaterThanOrEqual(4);
  });

  it('renders quick links to users, jobs, and audit log sections', async () => {
    mockGetStats.mockResolvedValue(makeStats());
    const wrapper = mount(AdminDashboard, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Manage users');
    expect(wrapper.text()).toContain('Manage jobs');
    expect(wrapper.text()).toContain('View audit log');
  });
});
