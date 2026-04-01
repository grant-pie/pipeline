import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import VerifyEmailView from './VerifyEmailView.vue';

const mockRoute = vi.hoisted(() => ({ query: {} as Record<string, string> }));
const mockVerifyEmail = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return { ...actual, useRoute: () => mockRoute };
});

vi.mock('@/api/auth', () => ({
  authApi: { verifyEmail: mockVerifyEmail },
}));

const stubs = { RouterLink: { template: '<a><slot /></a>' } };

describe('VerifyEmailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.query = { token: 'valid-token' };
  });

  it('shows a verifying message while the request is in flight', () => {
    mockRoute.query = { token: 'valid-token' };
    mockVerifyEmail.mockReturnValue(new Promise(() => {})); // never resolves
    const wrapper = mount(VerifyEmailView, { global: { stubs } });
    expect(wrapper.text()).toContain('Verifying');
  });

  it('shows "Email verified" after a successful API call', async () => {
    mockRoute.query = { token: 'valid-token' };
    mockVerifyEmail.mockResolvedValue({ message: 'Email verified.' });
    const wrapper = mount(VerifyEmailView, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Email verified');
  });

  it('shows a sign-in link after successful verification', async () => {
    mockRoute.query = { token: 'valid-token' };
    mockVerifyEmail.mockResolvedValue({ message: 'Email verified.' });
    const wrapper = mount(VerifyEmailView, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('a').exists()).toBe(true);
    expect(wrapper.text()).toContain('Sign in');
  });

  it('shows "Invalid link" when no token is present in the query string', async () => {
    mockRoute.query = {};
    mockVerifyEmail.mockResolvedValue({ message: 'ok' });
    const wrapper = mount(VerifyEmailView, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Invalid link');
  });

  it('does not call verifyEmail when token is missing', async () => {
    mockRoute.query = {};
    const wrapper = mount(VerifyEmailView, { global: { stubs } });
    await flushPromises();
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it('shows "Invalid link" when the API call fails', async () => {
    mockRoute.query = { token: 'bad-token' };
    mockVerifyEmail.mockRejectedValue(new Error('Invalid token'));
    const wrapper = mount(VerifyEmailView, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('Invalid link');
  });

  it('calls verifyEmail with the token from the query string', async () => {
    mockRoute.query = { token: 'my-token-value' };
    mockVerifyEmail.mockResolvedValue({ message: 'ok' });
    mount(VerifyEmailView, { global: { stubs } });
    await flushPromises();
    expect(mockVerifyEmail).toHaveBeenCalledWith('my-token-value');
  });
});
