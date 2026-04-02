import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';

// Control authentication state per-test
let isAuthenticated = false;
let isAdmin = false;

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ isAuthenticated, isAdmin }),
}));

// Import routes separately from the singleton router so we can build
// an isolated instance per test with createMemoryHistory (no DOM side-effects)
async function buildRouter(authenticated: boolean) {
  isAuthenticated = authenticated;
  // Re-import the module so the mock picks up the new isAuthenticated value
  vi.resetModules();
  const { default: router } = await import('./index');
  return router;
}

// Lightweight component stubs — the guard tests only care about navigation
const Stub = { template: '<div />' };

async function buildIsolatedRouter(authenticated: boolean, admin = false) {
  isAuthenticated = authenticated;
  isAdmin = admin;
  vi.resetModules();

  // Pull the raw routes array out so we can create a memory-history router
  const routerModule = await import('./index');
  // Use the real router from the module; swap its history for memory history in tests
  // by navigating directly — createMemoryHistory avoids window.location side effects
  return routerModule.default;
}

describe('Router navigation guards', () => {
  // Because the router module is a singleton we import it once and reset
  // isAuthenticated around each test via the mock factory.

  describe('requiresAuth routes', () => {
    it('redirects an unauthenticated user from /dashboard to /login', async () => {
      const router = await buildIsolatedRouter(false);
      await router.push('/dashboard');
      expect(router.currentRoute.value.name).toBe('login');
    });

    it('redirects an unauthenticated user from /jobs/new to /login', async () => {
      const router = await buildIsolatedRouter(false);
      await router.push('/jobs/new');
      expect(router.currentRoute.value.name).toBe('login');
    });

    it('allows an authenticated user to reach /dashboard', async () => {
      const router = await buildIsolatedRouter(true);
      await router.push('/dashboard');
      expect(router.currentRoute.value.name).toBe('dashboard');
    });
  });

  describe('guest routes', () => {
    it('redirects an authenticated user from /login to /dashboard', async () => {
      const router = await buildIsolatedRouter(true);
      await router.push('/login');
      expect(router.currentRoute.value.name).toBe('dashboard');
    });

    it('redirects an authenticated user from /register to /dashboard', async () => {
      const router = await buildIsolatedRouter(true);
      await router.push('/register');
      expect(router.currentRoute.value.name).toBe('dashboard');
    });

    it('allows an unauthenticated user to reach /login', async () => {
      const router = await buildIsolatedRouter(false);
      await router.push('/login');
      expect(router.currentRoute.value.name).toBe('login');
    });

    it('allows an unauthenticated user to reach /register', async () => {
      const router = await buildIsolatedRouter(false);
      await router.push('/register');
      expect(router.currentRoute.value.name).toBe('register');
    });
  });

  describe('requiresAdmin routes', () => {
    it('redirects unauthenticated user from /admin to /login', async () => {
      const router = await buildIsolatedRouter(false, false);
      await router.push('/admin');
      expect(router.currentRoute.value.name).toBe('login');
    });

    it('redirects authenticated non-admin user from /admin to /dashboard', async () => {
      const router = await buildIsolatedRouter(true, false);
      await router.push('/admin');
      expect(router.currentRoute.value.name).toBe('dashboard');
    });

    it('allows an authenticated admin to reach /admin', async () => {
      const router = await buildIsolatedRouter(true, true);
      await router.push('/admin');
      expect(router.currentRoute.value.name).toBe('admin-dashboard');
    });

    it('redirects non-admin from /admin/users to /dashboard', async () => {
      const router = await buildIsolatedRouter(true, false);
      await router.push('/admin/users');
      expect(router.currentRoute.value.name).toBe('dashboard');
    });
  });

  describe('unguarded routes', () => {
    it('/ redirects to /dashboard', async () => {
      const router = await buildIsolatedRouter(true);
      await router.push('/');
      expect(router.currentRoute.value.path).toBe('/dashboard');
    });

    it('an unknown path resolves to the not-found route', async () => {
      const router = await buildIsolatedRouter(false);
      await router.push('/this/does/not/exist');
      expect(router.currentRoute.value.name).toBe('not-found');
    });

    it('unauthenticated users can access /verify-email', async () => {
      const router = await buildIsolatedRouter(false);
      await router.push('/verify-email');
      expect(router.currentRoute.value.name).toBe('verify-email');
    });

    it('unauthenticated users can access /forgot-password', async () => {
      const router = await buildIsolatedRouter(false);
      await router.push('/forgot-password');
      expect(router.currentRoute.value.name).toBe('forgot-password');
    });

    it('unauthenticated users can access /reset-password', async () => {
      const router = await buildIsolatedRouter(false);
      await router.push('/reset-password');
      expect(router.currentRoute.value.name).toBe('reset-password');
    });
  });
});
