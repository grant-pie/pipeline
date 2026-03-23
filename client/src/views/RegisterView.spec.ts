import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import RegisterView from './RegisterView.vue';

// Mock the auth store directly — tests the view in isolation
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    user: null,
    token: null,
    register: vi.fn().mockResolvedValue({ message: 'Account created.' }),
    logout: vi.fn(),
  })),
}));

const mockPush = vi.fn();
const stubs = { RouterLink: { template: '<a><slot /></a>' } };

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRouter: () => ({ push: mockPush }),
  };
});

describe('RegisterView', () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    mockPush.mockReset();
    div = document.createElement('div');
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  it('renders the email and password fields', () => {
    const wrapper = mount(RegisterView, {
      attachTo: div,
      global: { stubs },
    });
    expect(wrapper.find('#email').exists()).toBe(true);
    expect(wrapper.find('#password').exists()).toBe(true);
    expect(wrapper.find('#confirm').exists()).toBe(true);
  });

  it('shows an error when passwords do not match', async () => {
    const wrapper = mount(RegisterView, {
      attachTo: div,
      global: { stubs },
    });

    await wrapper.find('#email').setValue('test@test.com');
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm').setValue('differentpassword');
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.text()).toContain('Passwords do not match');
  });

  it('does not show an error when passwords match', async () => {
    const wrapper = mount(RegisterView, {
      attachTo: div,
      global: { stubs },
    });

    await wrapper.find('#email').setValue('test@test.com');
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm').setValue('password123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Passwords do not match');
  });

  it('shows the success state after successful registration', async () => {
    const wrapper = mount(RegisterView, {
      attachTo: div,
      global: { stubs },
    });

    await wrapper.find('#email').setValue('test@test.com');
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm').setValue('password123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Check your inbox');
  });
});
