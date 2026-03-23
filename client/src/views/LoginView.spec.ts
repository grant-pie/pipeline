import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LoginView from './LoginView.vue';

// Mock the auth store directly — tests the view in isolation
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    user: null,
    token: null,
    login: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
    logout: vi.fn(),
  })),
}));

// Mock authApi for the resend verification call
vi.mock('@/api/auth', () => ({
  authApi: {
    resendVerification: vi.fn().mockResolvedValue({ message: 'Sent.' }),
    login: vi.fn(),
  },
}));

const mockPush = vi.fn();
const mockRoute = { query: {} as Record<string, string> };
const stubs = { RouterLink: { template: '<a><slot /></a>' } };

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRouter: () => ({ push: mockPush }),
    useRoute: () => mockRoute,
  };
});

describe('LoginView', () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    mockRoute.query = {};
    mockPush.mockReset();
    div = document.createElement('div');
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  it('renders the email and password fields', () => {
    const wrapper = mount(LoginView, {
      attachTo: div,
      global: { stubs },
    });
    expect(wrapper.find('#email').exists()).toBe(true);
    expect(wrapper.find('#password').exists()).toBe(true);
  });

  it('shows an error message when login fails', async () => {
    const wrapper = mount(LoginView, {
      attachTo: div,
      global: { stubs },
    });

    await wrapper.find('#email').setValue('wrong@test.com');
    await wrapper.find('#password').setValue('wrongpassword');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('.error-msg').exists()).toBe(true);
    expect(wrapper.text()).toContain('Invalid credentials');
  });

  it('shows a session expired message when reason=expired query param is present', async () => {
    mockRoute.query = { reason: 'expired' };

    const wrapper = mount(LoginView, {
      attachTo: div,
      global: { stubs },
    });

    expect(wrapper.find('.session-msg').exists()).toBe(true);
    expect(wrapper.text()).toContain('session expired');
  });

  it('shows the resend button when the unverified error is returned', async () => {
    const { useAuthStore } = await import('@/stores/auth');
    vi.mocked(useAuthStore).mockReturnValueOnce({
      isAuthenticated: false,
      user: null,
      token: null,
      login: vi.fn().mockRejectedValue(new Error('Please verify your email before signing in.')),
      logout: vi.fn(),
    } as never);

    const wrapper = mount(LoginView, {
      attachTo: div,
      global: { stubs },
    });

    await wrapper.find('#email').setValue('unverified@test.com');
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('.resend-btn').exists()).toBe(true);
    expect(wrapper.find('.resend-btn').attributes('type')).toBe('button');
  });
});
