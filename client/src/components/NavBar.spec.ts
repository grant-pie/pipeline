import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import NavBar from './NavBar.vue';

const mockPush = vi.fn();
const mockLogout = vi.fn();
let mockIsAdmin = false;
let mockRoutePath = '/dashboard';

const mockDrawerOpen = ref(false);

vi.mock('@/composables/useAdminNav', () => ({
  useAdminNav: () => ({ drawerOpen: mockDrawerOpen }),
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => ({ path: mockRoutePath }),
    useRouter: () => ({ push: mockPush }),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', email: 'test@example.com', createdAt: '2026-01-01' },
    isAdmin: mockIsAdmin,
    logout: mockLogout,
  }),
}));

const stubs = {
  RouterLink: {
    template: '<a :href="typeof to === \'string\' ? to : JSON.stringify(to)" :class="$attrs.class"><slot /></a>',
    props: ['to'],
  },
};

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin = false;
    mockRoutePath = '/dashboard';
    mockDrawerOpen.value = false;
  });

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

  it('does not render the Admin link when isAdmin is false', () => {
    mockIsAdmin = false;
    const wrapper = mount(NavBar, { global: { stubs } });
    expect(wrapper.find('.admin-link').exists()).toBe(false);
  });

  it('renders the Admin link when isAdmin is true', () => {
    mockIsAdmin = true;
    const wrapper = mount(NavBar, { global: { stubs } });
    expect(wrapper.find('.admin-link').exists()).toBe(true);
  });

  it('Admin link points to admin-dashboard route when not on admin pages', () => {
    mockIsAdmin = true;
    mockRoutePath = '/dashboard';
    const wrapper = mount(NavBar, { global: { stubs } });
    const adminLink = wrapper.find('.admin-link');
    expect(adminLink.attributes('href')).toContain('admin-dashboard');
  });

  it('Admin link shows "Dashboard" text when already on admin pages', () => {
    mockIsAdmin = true;
    mockRoutePath = '/admin/users';
    const wrapper = mount(NavBar, { global: { stubs } });
    expect(wrapper.find('.admin-link').text()).toBe('Dashboard');
  });

  it('Admin link points to dashboard route when on admin pages', () => {
    mockIsAdmin = true;
    mockRoutePath = '/admin/users';
    const wrapper = mount(NavBar, { global: { stubs } });
    expect(wrapper.find('.admin-link').attributes('href')).toContain('dashboard');
  });

  it('applies is-admin class to navbar when on admin pages', () => {
    mockRoutePath = '/admin/dashboard';
    const wrapper = mount(NavBar, { global: { stubs } });
    expect(wrapper.find('.navbar').classes()).toContain('is-admin');
  });

  it('does not apply is-admin class when not on admin pages', () => {
    mockRoutePath = '/dashboard';
    const wrapper = mount(NavBar, { global: { stubs } });
    expect(wrapper.find('.navbar').classes()).not.toContain('is-admin');
  });

  it('renders hamburger button when on admin pages', () => {
    mockRoutePath = '/admin/dashboard';
    const wrapper = mount(NavBar, { global: { stubs } });
    expect(wrapper.find('.hamburger').exists()).toBe(true);
  });

  it('does not render hamburger button when not on admin pages', () => {
    mockRoutePath = '/dashboard';
    const wrapper = mount(NavBar, { global: { stubs } });
    expect(wrapper.find('.hamburger').exists()).toBe(false);
  });

  it('clicking hamburger toggles drawerOpen', async () => {
    mockRoutePath = '/admin/dashboard';
    mockDrawerOpen.value = false;
    const wrapper = mount(NavBar, { global: { stubs } });
    await wrapper.find('.hamburger').trigger('click');
    expect(mockDrawerOpen.value).toBe(true);
    await wrapper.find('.hamburger').trigger('click');
    expect(mockDrawerOpen.value).toBe(false);
  });
});
