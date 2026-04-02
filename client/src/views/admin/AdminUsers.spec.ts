import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminUsers from './AdminUsers.vue';

const mockListUsers = vi.hoisted(() => vi.fn());

vi.mock('@/api/admin', () => ({
  adminApi: { listUsers: mockListUsers },
}));

const stubs = { RouterLink: { template: '<a><slot /></a>' } };

function makeUser(overrides = {}) {
  return {
    id: 'user-uuid-1',
    email: 'user@example.com',
    role: 'user',
    isVerified: true,
    isSuspended: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    jobCount: 5,
    ...overrides,
  };
}

function makeResponse(users = [makeUser()], total = 1, hasMore = false) {
  return { data: users, total, hasMore };
}

describe('AdminUsers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls adminApi.listUsers(1, 20, undefined) on mount', async () => {
    mockListUsers.mockResolvedValue(makeResponse());
    mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(mockListUsers).toHaveBeenCalledWith(1, 20, undefined);
  });

  it('renders a loading indicator while the request is in flight', () => {
    mockListUsers.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    expect(wrapper.text()).toContain('Loading');
  });

  it('renders an error message when listUsers() rejects', async () => {
    mockListUsers.mockRejectedValue(new Error('Network failure'));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Network failure');
  });

  it('renders "No users found." when the response is empty', async () => {
    mockListUsers.mockResolvedValue(makeResponse([], 0));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('No users found.');
  });

  it('renders one table row per user', async () => {
    mockListUsers.mockResolvedValue(
      makeResponse([makeUser(), makeUser({ id: 'u2', email: 'b@example.com' })], 2),
    );
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  });

  it('renders user email in each row', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser({ email: 'alice@example.com' })]));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('alice@example.com');
  });

  it('applies badge-admin class when user.role is "admin"', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser({ role: 'admin' })]));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-admin').exists()).toBe(true);
  });

  it('applies badge-user class when user.role is "user"', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser({ role: 'user' })]));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-user').exists()).toBe(true);
  });

  it('renders "suspended" badge when user.isSuspended is true', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser({ isSuspended: true })]));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-danger').text()).toBe('suspended');
  });

  it('renders "unverified" badge when user.isVerified is false', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser({ isVerified: false })]));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-muted').text()).toBe('unverified');
  });

  it('renders "active" badge when user is verified and not suspended', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser({ isVerified: true, isSuspended: false })]));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-success').text()).toBe('active');
  });

  it('renders the job count for each user', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser({ jobCount: 12 })]));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('12');
  });

  it('renders the total count label when total > 0', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser()], 42));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.total-label').text()).toContain('42');
  });

  it('Prev button is disabled on page 1', async () => {
    mockListUsers.mockResolvedValue(makeResponse());
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    const prevBtn = wrapper.findAll('button').find((b) => b.text().includes('Prev'));
    expect(prevBtn?.attributes('disabled')).toBeDefined();
  });

  it('Next button is disabled when hasMore is false', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser()], 1, false));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('Next'));
    expect(nextBtn?.attributes('disabled')).toBeDefined();
  });

  it('Next button is enabled when hasMore is true', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser()], 50, true));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('Next'));
    expect(nextBtn?.attributes('disabled')).toBeUndefined();
  });

  it('clicking Next increments page and re-fetches', async () => {
    mockListUsers.mockResolvedValue(makeResponse([makeUser()], 50, true));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    mockListUsers.mockResolvedValue(makeResponse([makeUser({ id: 'u2' })], 50, false));
    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('Next'))!;
    await nextBtn.trigger('click');
    await flushPromises();
    expect(mockListUsers).toHaveBeenCalledWith(2, 20, undefined);
  });

  it('clicking Prev decrements page and re-fetches', async () => {
    // Start on page 2
    mockListUsers.mockResolvedValue(makeResponse([makeUser()], 50, true));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    // Go to page 2
    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('Next'))!;
    await nextBtn.trigger('click');
    await flushPromises();
    // Go back to page 1
    const prevBtn = wrapper.findAll('button').find((b) => b.text().includes('Prev'))!;
    await prevBtn.trigger('click');
    await flushPromises();
    const lastCall = mockListUsers.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(1);
  });

  it('debounces search — does not call API immediately on keystroke', async () => {
    mockListUsers.mockResolvedValue(makeResponse());
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    mockListUsers.mockClear();
    await wrapper.find('input[type="search"]').setValue('alice');
    // No extra call yet (timer hasn't fired)
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it('calls listUsers with trimmed search after debounce fires', async () => {
    vi.useFakeTimers();
    mockListUsers.mockResolvedValue(makeResponse());
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    mockListUsers.mockClear();
    await wrapper.find('input[type="search"]').setValue('  alice  ');
    vi.advanceTimersByTime(300);
    await flushPromises();
    expect(mockListUsers).toHaveBeenCalledWith(1, 20, 'alice');
    vi.useRealTimers();
  });

  it('resets to page 1 when a new search is entered', async () => {
    vi.useFakeTimers();
    mockListUsers.mockResolvedValue(makeResponse([makeUser()], 50, true));
    const wrapper = mount(AdminUsers, { global: { stubs } });
    await flushPromises();
    // Advance to page 2
    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('Next'))!;
    await nextBtn.trigger('click');
    await flushPromises();
    // Type a search
    mockListUsers.mockClear();
    await wrapper.find('input[type="search"]').setValue('bob');
    vi.advanceTimersByTime(300);
    await flushPromises();
    expect(mockListUsers.mock.calls[0][0]).toBe(1);
    vi.useRealTimers();
  });
});
