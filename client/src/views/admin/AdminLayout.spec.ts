import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AdminLayout from './AdminLayout.vue';

const mockPush = vi.fn();
const mockLogout = vi.fn();

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return { ...actual, useRouter: () => ({ push: mockPush }) };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    logout: mockLogout,
  }),
}));

const stubs = {
  RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
  RouterView: { template: '<div class="router-view-stub" />' },
};

describe('AdminLayout', () => {
  it('renders the "Pipeline" brand text', () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    expect(wrapper.text()).toContain('Pipeline');
  });

  it('renders the "Admin" badge', () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    expect(wrapper.find('.admin-badge').text()).toBe('Admin');
  });

  it('renders the Overview navigation link', () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    expect(wrapper.text()).toContain('Overview');
  });

  it('renders the Users navigation link', () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    expect(wrapper.text()).toContain('Users');
  });

  it('renders the Jobs navigation link', () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    expect(wrapper.text()).toContain('Jobs');
  });

  it('renders the Audit Log navigation link', () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    expect(wrapper.text()).toContain('Audit Log');
  });

  it("renders the logged-in admin's email in the footer", () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    expect(wrapper.find('.nav-email').text()).toBe('admin@example.com');
  });

  it('renders a sign-out button', () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    expect(wrapper.find('button').text()).toBe('Sign out');
  });

  it('renders a RouterView for nested content', () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    expect(wrapper.find('.router-view-stub').exists()).toBe(true);
  });

  it('calls authStore.logout() when sign out is clicked', async () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    await wrapper.find('button').trigger('click');
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('redirects to { name: "login" } after signing out', async () => {
    const wrapper = mount(AdminLayout, { global: { stubs } });
    await wrapper.find('button').trigger('click');
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' });
  });
});
