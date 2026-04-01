import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ForgotPasswordView from './ForgotPasswordView.vue';

const mockForgotPassword = vi.hoisted(() => vi.fn());

vi.mock('@/api/auth', () => ({
  authApi: { forgotPassword: mockForgotPassword },
}));

const stubs = { RouterLink: { template: '<a><slot /></a>' } };

describe('ForgotPasswordView', () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    mockForgotPassword.mockReset();
    div = document.createElement('div');
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  it('renders the email input and submit button', () => {
    const wrapper = mount(ForgotPasswordView, { attachTo: div, global: { stubs } });
    expect(wrapper.find('#email').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('calls authApi.forgotPassword with the entered email on submit', async () => {
    mockForgotPassword.mockResolvedValue({ message: 'Sent.' });
    const wrapper = mount(ForgotPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
  });

  it('shows the success state after submission', async () => {
    mockForgotPassword.mockResolvedValue({ message: 'Sent.' });
    const wrapper = mount(ForgotPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Check your inbox');
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('shows an error message when the API call fails', async () => {
    mockForgotPassword.mockRejectedValue(new Error('Something went wrong.'));
    const wrapper = mount(ForgotPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('.error-msg').exists()).toBe(true);
    expect(wrapper.text()).toContain('Something went wrong.');
  });

  it('disables the submit button while loading', async () => {
    let resolve: () => void;
    mockForgotPassword.mockReturnValue(new Promise<{ message: string }>((r) => { resolve = () => r({ message: 'ok' }); }));
    const wrapper = mount(ForgotPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#email').setValue('user@example.com');
    wrapper.find('form').trigger('submit.prevent');

    await vi.waitFor(() =>
      expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true),
    );
    resolve!();
  });

  it('changes button text to "Sending…" while loading', async () => {
    let resolve: () => void;
    mockForgotPassword.mockReturnValue(new Promise<{ message: string }>((r) => { resolve = () => r({ message: 'ok' }); }));
    const wrapper = mount(ForgotPasswordView, { attachTo: div, global: { stubs } });

    await wrapper.find('#email').setValue('user@example.com');
    wrapper.find('form').trigger('submit.prevent');

    await vi.waitFor(() =>
      expect(wrapper.find('button[type="submit"]').text()).toContain('Sending'),
    );
    resolve!();
  });
});
