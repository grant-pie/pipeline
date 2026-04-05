import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import AdminNav from './AdminNav.vue';

const mockDrawerOpen = ref(false);

vi.mock('@/composables/useAdminNav', () => ({
  useAdminNav: () => ({ drawerOpen: mockDrawerOpen }),
}));

const mockLogout = vi.fn();
const mockPush = vi.fn();
const mockRoute = reactive({ path: '/admin/dashboard', name: 'admin-dashboard' });

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'admin-1', email: 'admin@example.com' },
    logout: mockLogout,
  }),
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => mockRoute,
    useRouter: () => ({ push: mockPush }),
  };
});

const stubs = {
  RouterLink: {
    template: '<a :href="typeof to === \'string\' ? to : JSON.stringify(to)" :class="$attrs.class"><slot /></a>',
    props: ['to'],
  },
};

describe('AdminNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrawerOpen.value = false;
    mockRoute.path = '/admin/dashboard';
    mockRoute.name = 'admin-dashboard';
  });

  // ── Structural rendering ──────────────────────────────────────────────────

  it('renders the Pipeline brand link', () => {
    const wrapper = mount(AdminNav, { global: { stubs } });
    expect(wrapper.text()).toContain('Pipeline');
  });

  it('renders the Admin badge', () => {
    const wrapper = mount(AdminNav, { global: { stubs } });
    expect(wrapper.find('.admin-badge').text()).toBe('Admin');
  });

  it('renders all four navigation links', () => {
    const wrapper = mount(AdminNav, { global: { stubs } });
    const text = wrapper.text();
    expect(text).toContain('Overview');
    expect(text).toContain('Users');
    expect(text).toContain('Jobs');
    expect(text).toContain('Audit Log');
  });

  it('displays the authenticated user email', () => {
    const wrapper = mount(AdminNav, { global: { stubs } });
    expect(wrapper.find('.nav-email').text()).toBe('admin@example.com');
  });

  // ── Active link highlighting ───────────────────────────────────────────────

  it('applies nav-link-active to Overview when on admin-dashboard route', () => {
    mockRoute.name = 'admin-dashboard';
    const wrapper = mount(AdminNav, { global: { stubs } });
    const links = wrapper.findAll('.nav-link');
    const overviewLink = links.find((l) => l.text().trim() === 'Overview')!;
    expect(overviewLink.classes()).toContain('nav-link-active');
  });

  it('applies nav-link-active to Users when on admin-user-detail route', () => {
    mockRoute.name = 'admin-user-detail';
    const wrapper = mount(AdminNav, { global: { stubs } });
    const links = wrapper.findAll('.nav-link');
    const usersLink = links.find((l) => l.text().trim() === 'Users')!;
    expect(usersLink.classes()).toContain('nav-link-active');
  });

  it('applies nav-link-active to Jobs when on admin-job-detail route', () => {
    mockRoute.name = 'admin-job-detail';
    const wrapper = mount(AdminNav, { global: { stubs } });
    const links = wrapper.findAll('.nav-link');
    const jobsLink = links.find((l) => l.text().trim() === 'Jobs')!;
    expect(jobsLink.classes()).toContain('nav-link-active');
  });

  it('does not apply nav-link-active to non-current sections', () => {
    mockRoute.name = 'admin-dashboard';
    const wrapper = mount(AdminNav, { global: { stubs } });
    const links = wrapper.findAll('.nav-link');
    const usersLink = links.find((l) => l.text().trim() === 'Users')!;
    expect(usersLink.classes()).not.toContain('nav-link-active');
  });

  // ── Drawer state ──────────────────────────────────────────────────────────

  it('applies drawer-open class to nav when drawerOpen is true', async () => {
    mockDrawerOpen.value = true;
    const wrapper = mount(AdminNav, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('.admin-nav').classes()).toContain('drawer-open');
  });

  it('does not apply drawer-open class when drawerOpen is false', () => {
    mockDrawerOpen.value = false;
    const wrapper = mount(AdminNav, { global: { stubs } });
    expect(wrapper.find('.admin-nav').classes()).not.toContain('drawer-open');
  });

  it('clicking a nav link sets drawerOpen to false', async () => {
    mockDrawerOpen.value = true;
    const wrapper = mount(AdminNav, { global: { stubs } });
    const links = wrapper.findAll('.nav-link');
    await links[0].trigger('click');
    expect(mockDrawerOpen.value).toBe(false);
  });

  it('route path change closes the drawer via watcher', async () => {
    mockDrawerOpen.value = true;
    mount(AdminNav, { global: { stubs } });
    mockRoute.path = '/admin/users';
    await flushPromises();
    expect(mockDrawerOpen.value).toBe(false);
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  it('Sign out button calls authStore.logout()', async () => {
    const wrapper = mount(AdminNav, { global: { stubs } });
    await wrapper.find('button.btn-ghost').trigger('click');
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('Sign out button redirects to login route', async () => {
    const wrapper = mount(AdminNav, { global: { stubs } });
    await wrapper.find('button.btn-ghost').trigger('click');
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' });
  });
});
