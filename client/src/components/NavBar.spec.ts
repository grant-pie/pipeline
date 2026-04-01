import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NavBar from './NavBar.vue';

const mockPush = vi.fn();
const mockLogout = vi.fn();

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return { ...actual, useRouter: () => ({ push: mockPush }) };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', email: 'test@example.com', createdAt: '2026-01-01' },
    logout: mockLogout,
  }),
}));

const stubs = { RouterLink: { template: '<a><slot /></a>' } };

describe('NavBar', () => {
  it("renders the authenticated user's email", () => {
    const wrapper = mount(NavBar, { global: { stubs } });
    expect(wrapper.text()).toContain('test@example.com');
  });

  it('clicking "Sign out" calls authStore.logout()', async () => {
    const wrapper = mount(NavBar, { global: { stubs } });
    await wrapper.find('button').trigger('click');
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('clicking "Sign out" redirects to the login route', async () => {
    const wrapper = mount(NavBar, { global: { stubs } });
    await wrapper.find('button').trigger('click');
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' });
  });
});
