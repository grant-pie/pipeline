import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ResetPasswordView from './ResetPasswordView.vue';

const mockRoute = vi.hoisted(() => ({ query: {} as Record<string, string> }));
const mockResetPassword = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return { ...actual, useRoute: () => mockRoute };
});

vi.mock('@/api/auth', () => ({
  authApi: { resetPassword: mockResetPassword },
}));

const stubs = { RouterLink: { template: '<a><slot /></a>' } };

describe('ResetPasswordView', () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    mockRoute.query = { token: 'valid-reset-token' };
    mockResetPassword.mockReset();
    div = document.createElement('div');
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  // ── Missing token state ────────────────────────────────────────────────

  it('shows "Invalid reset link" when no token is in the URL', () => {
    mockRoute.query = {};
    const wrapper = mount(ResetPasswordView, { global: { stubs } });
    expect(wrapper.text()).toContain('Invalid reset link');
  });

  it('shows a link to request a new link when token is missing', () => {
    mockRoute.query = {};
    const wrapper = mount(ResetPasswordView, { global: { stubs } });
    expect(wrapper.find('a').exists()).toBe(true);
    expect(wrapper.text()).toContain('Request new link');
  });

  it('does not show the form when token is missing', () => {
    mockRoute.query = {};
    const wrapper = mount(ResetPasswordView, { global: { stubs } });
    expect(wrapper.find('form').exists()).toBe(false);
  });

  // ── Form state ─────────────────────────────────────────────────────────

  it('renders the password form when token is present', () => {
    const wrapper = mount(ResetPasswordView, { attachTo: div, global: { stubs } });
    expect(wrapper.find('#password').exists()).toBe(true);
    expect(wrapper.find('#confirm').exists()).toBe(true);
  });

  it('shows an error when passwords do not match', async () => {
    const wrapper = mount(ResetPasswordView, { attachTo: div, global: { stubs } });
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm').setValue('differentpassword');
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.find('.error-msg').exists()).toBe(true);
    expect(wrapper.text()).toContain('Passwords do not match');
  });

  it('does not call the API when passwords do not match', async () => {
    const wrapper = mount(ResetPasswordView, { attachTo: div, global: { stubs } });
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm').setValue('differentpassword');
    await wrapper.find('form').trigger('submit.prevent');

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('calls authApi.resetPassword with the token and password on valid submit', async () => {
    mockResetPassword.mockResolvedValue({ message: 'Password updated.' });
    const wrapper = mount(ResetPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm').setValue('newpassword123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockResetPassword).toHaveBeenCalledWith('valid-reset-token', 'newpassword123');
  });

  it('shows the success state after a successful reset', async () => {
    mockResetPassword.mockResolvedValue({ message: 'Password updated.' });
    const wrapper = mount(ResetPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm').setValue('newpassword123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Password updated');
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('shows a sign-in link in the success state', async () => {
    mockResetPassword.mockResolvedValue({ message: 'Password updated.' });
    const wrapper = mount(ResetPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm').setValue('newpassword123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Sign in');
  });

  it('shows an error message when the API call fails', async () => {
    mockResetPassword.mockRejectedValue(new Error('Invalid or expired reset link.'));
    const wrapper = mount(ResetPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm').setValue('newpassword123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('.error-msg').exists()).toBe(true);
    expect(wrapper.text()).toContain('Invalid or expired reset link.');
  });

  it('disables the submit button while loading', async () => {
    let resolve: () => void;
    mockResetPassword.mockReturnValue(new Promise<{ message: string }>((r) => { resolve = () => r({ message: 'ok' }); }));
    const wrapper = mount(ResetPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm').setValue('newpassword123');
    wrapper.find('form').trigger('submit.prevent');

    await vi.waitFor(() =>
      expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true),
    );
    resolve!();
  });
});
