import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminUserDetail from './AdminUserDetail.vue';

const mockGetUser = vi.hoisted(() => vi.fn());
const mockSetRole = vi.hoisted(() => vi.fn());
const mockSuspendUser = vi.hoisted(() => vi.fn());
const mockUnsuspendUser = vi.hoisted(() => vi.fn());
const mockForceVerify = vi.hoisted(() => vi.fn());
const mockResendVerification = vi.hoisted(() => vi.fn());
const mockTriggerPasswordReset = vi.hoisted(() => vi.fn());
const mockDeleteUser = vi.hoisted(() => vi.fn());

vi.mock('@/api/admin', () => ({
  adminApi: {
    getUser: mockGetUser,
    setRole: mockSetRole,
    suspendUser: mockSuspendUser,
    unsuspendUser: mockUnsuspendUser,
    forceVerify: mockForceVerify,
    resendVerification: mockResendVerification,
    triggerPasswordReset: mockTriggerPasswordReset,
    deleteUser: mockDeleteUser,
  },
}));

const mockPush = vi.fn();

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => ({ params: { id: 'user-uuid-1' } }),
    useRouter: () => ({ push: mockPush }),
  };
});

const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
};

function makeUser(overrides = {}) {
  return {
    id: 'user-uuid-1',
    email: 'alice@example.com',
    role: 'user',
    isVerified: true,
    isSuspended: false,
    createdAt: '2024-01-15T00:00:00.000Z',
    jobCount: 10,
    appliedCount: 5,
    interviewingCount: 3,
    offeredCount: 1,
    rejectedCount: 1,
    ...overrides,
  };
}

describe('AdminUserDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  // ── Loading / error / render ──────────────────────────────────────────────

  it('renders a loading indicator while the request is in flight', () => {
    mockGetUser.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    expect(wrapper.text()).toContain('Loading');
  });

  it('renders an error message when getUser() rejects', async () => {
    mockGetUser.mockRejectedValue(new Error('Not found'));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Not found');
  });

  it('renders the user email as the page title', async () => {
    mockGetUser.mockResolvedValue(makeUser());
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('alice@example.com');
  });

  // ── Role badge ────────────────────────────────────────────────────────────

  it('applies badge-user class when role is "user"', async () => {
    mockGetUser.mockResolvedValue(makeUser({ role: 'user' }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-user').exists()).toBe(true);
  });

  it('applies badge-admin class when role is "admin"', async () => {
    mockGetUser.mockResolvedValue(makeUser({ role: 'admin' }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-admin').exists()).toBe(true);
  });

  // ── Status badge ──────────────────────────────────────────────────────────

  it('renders "suspended" badge when user.isSuspended is true', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isSuspended: true }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-danger').text()).toBe('suspended');
  });

  it('renders "unverified" badge when user.isVerified is false', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isVerified: false }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-muted').text()).toBe('unverified');
  });

  it('renders "active" badge when user is verified and not suspended', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isVerified: true, isSuspended: false }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.badge-success').text()).toBe('active');
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  it('renders the total job count in the stats section', async () => {
    mockGetUser.mockResolvedValue(makeUser({ jobCount: 10 }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('10');
  });

  it('renders all five stat counts', async () => {
    mockGetUser.mockResolvedValue(makeUser({
      jobCount: 20, appliedCount: 8, interviewingCount: 6, offeredCount: 4, rejectedCount: 2,
    }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('8');
    expect(wrapper.text()).toContain('6');
    expect(wrapper.text()).toContain('4');
    expect(wrapper.text()).toContain('2');
  });

  // ── Role card ─────────────────────────────────────────────────────────────

  it('shows "Promote to admin" button when user role is "user"', async () => {
    mockGetUser.mockResolvedValue(makeUser({ role: 'user' }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Promote to admin');
  });

  it('shows "Demote to user" button when user role is "admin"', async () => {
    mockGetUser.mockResolvedValue(makeUser({ role: 'admin' }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Demote to user');
  });

  it('calls adminApi.setRole with "admin" when Promote is clicked', async () => {
    mockGetUser.mockResolvedValue(makeUser({ role: 'user' }));
    mockSetRole.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Promote to admin'))!;
    await btn.trigger('click');
    await flushPromises();
    expect(mockSetRole).toHaveBeenCalledWith('user-uuid-1', 'admin');
  });

  it('optimistically updates role badge after setRole succeeds', async () => {
    mockGetUser.mockResolvedValue(makeUser({ role: 'user' }));
    mockSetRole.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Promote to admin'))!;
    await btn.trigger('click');
    await flushPromises();
    expect(wrapper.find('.badge-admin').exists()).toBe(true);
  });

  it('shows success message after setRole succeeds', async () => {
    mockGetUser.mockResolvedValue(makeUser({ role: 'user' }));
    mockSetRole.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Promote to admin'))!;
    await btn.trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-msg').text()).toContain('Role updated');
  });

  it('shows error message when setRole rejects', async () => {
    mockGetUser.mockResolvedValue(makeUser({ role: 'user' }));
    mockSetRole.mockRejectedValue(new Error('Forbidden'));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Promote to admin'))!;
    await btn.trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-msg').text()).toContain('Forbidden');
  });

  // ── Suspend card ──────────────────────────────────────────────────────────

  it('shows "Suspend" button when user is not suspended', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isSuspended: false }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Suspend');
  });

  it('shows "Unsuspend" button when user is suspended', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isSuspended: true }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Unsuspend');
  });

  it('calls adminApi.suspendUser when Suspend is clicked', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isSuspended: false }));
    mockSuspendUser.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Suspend')!;
    await btn.trigger('click');
    await flushPromises();
    expect(mockSuspendUser).toHaveBeenCalledWith('user-uuid-1');
  });

  it('optimistically updates to "suspended" badge after suspend succeeds', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isSuspended: false }));
    mockSuspendUser.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Suspend')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('.badge-danger').text()).toBe('suspended');
  });

  it('calls adminApi.unsuspendUser when Unsuspend is clicked', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isSuspended: true }));
    mockUnsuspendUser.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Unsuspend')!;
    await btn.trigger('click');
    await flushPromises();
    expect(mockUnsuspendUser).toHaveBeenCalledWith('user-uuid-1');
  });

  // ── Verification card ─────────────────────────────────────────────────────

  it('"Force verify" button is disabled when user is already verified', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isVerified: true }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Force verify')!;
    expect(btn.attributes('disabled')).toBeDefined();
  });

  it('"Force verify" button is enabled when user is not verified', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isVerified: false }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Force verify')!;
    expect(btn.attributes('disabled')).toBeUndefined();
  });

  it('calls adminApi.forceVerify when Force verify is clicked', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isVerified: false }));
    mockForceVerify.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Force verify')!.trigger('click');
    await flushPromises();
    expect(mockForceVerify).toHaveBeenCalledWith('user-uuid-1');
  });

  it('optimistically marks user as verified after forceVerify succeeds', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isVerified: false }));
    mockForceVerify.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Force verify')!.trigger('click');
    await flushPromises();
    // Force verify button should now be disabled (user is now verified)
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Force verify')!;
    expect(btn.attributes('disabled')).toBeDefined();
  });

  it('"Resend email" button is disabled when user is already verified', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isVerified: true }));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Resend email')!;
    expect(btn.attributes('disabled')).toBeDefined();
  });

  it('calls adminApi.resendVerification when Resend email is clicked', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isVerified: false }));
    mockResendVerification.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Resend email')!.trigger('click');
    await flushPromises();
    expect(mockResendVerification).toHaveBeenCalledWith('user-uuid-1');
  });

  it('shows success message after resendVerification succeeds', async () => {
    mockGetUser.mockResolvedValue(makeUser({ isVerified: false }));
    mockResendVerification.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Resend email')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-msg').text()).toContain('Verification email sent');
  });

  // ── Password reset card ───────────────────────────────────────────────────

  it('calls adminApi.triggerPasswordReset when Send reset email is clicked', async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockTriggerPasswordReset.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Send reset email')!.trigger('click');
    await flushPromises();
    expect(mockTriggerPasswordReset).toHaveBeenCalledWith('user-uuid-1');
  });

  it('shows success message after triggerPasswordReset succeeds', async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockTriggerPasswordReset.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Send reset email')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-msg').text()).toContain('Password reset email sent');
  });

  // ── Delete card ───────────────────────────────────────────────────────────

  it('calls window.confirm before deleting', async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockDeleteUser.mockResolvedValue(null);
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Delete user')!.trigger('click');
    expect(window.confirm).toHaveBeenCalledTimes(1);
  });

  it('does not call deleteUser when confirm is cancelled', async () => {
    mockGetUser.mockResolvedValue(makeUser());
    vi.stubGlobal('confirm', vi.fn(() => false));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Delete user')!.trigger('click');
    await flushPromises();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('calls adminApi.deleteUser when confirmed', async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockDeleteUser.mockResolvedValue(null);
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Delete user')!.trigger('click');
    await flushPromises();
    expect(mockDeleteUser).toHaveBeenCalledWith('user-uuid-1');
  });

  it('navigates to admin-users after successful delete', async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockDeleteUser.mockResolvedValue(null);
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Delete user')!.trigger('click');
    await flushPromises();
    expect(mockPush).toHaveBeenCalledWith({ name: 'admin-users' });
  });

  it('shows error message when deleteUser rejects', async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockDeleteUser.mockRejectedValue(new Error('Delete failed'));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Delete user')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-msg').text()).toContain('Delete failed');
  });

  it('does not navigate away when deleteUser rejects', async () => {
    mockGetUser.mockResolvedValue(makeUser());
    mockDeleteUser.mockRejectedValue(new Error('Delete failed'));
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Delete user')!.trigger('click');
    await flushPromises();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── Action message auto-dismiss ───────────────────────────────────────────

  it('action message disappears after 4 seconds', async () => {
    vi.useFakeTimers();
    mockGetUser.mockResolvedValue(makeUser());
    mockTriggerPasswordReset.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Send reset email')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('.action-msg').exists()).toBe(true);
    vi.advanceTimersByTime(4000);
    await flushPromises();
    expect(wrapper.find('.action-msg').exists()).toBe(false);
    vi.useRealTimers();
  });
});
