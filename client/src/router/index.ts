/**
 * router/index.ts — Vue Router configuration and navigation guards.
 *
 * Defines all application routes and a global beforeEach guard that enforces
 * three access rules:
 *
 *   requiresAuth  — Unauthenticated users are redirected to /login.
 *   requiresAdmin — Non-admin users are redirected to /dashboard.
 *   guest         — Already-authenticated users are redirected to /dashboard
 *                   (prevents visiting /login or /register when signed in).
 *
 * All page components are lazy-loaded (dynamic import) so each route's bundle
 * is only fetched when first visited.
 *
 * Route hierarchy:
 *   /                       → redirect to /dashboard
 *   /login                  → LoginView         (guest)
 *   /register               → RegisterView      (guest)
 *   /verify-email           → VerifyEmailView   (public)
 *   /forgot-password        → ForgotPasswordView (public)
 *   /reset-password         → ResetPasswordView  (public)
 *   /dashboard              → DashboardView     (requiresAuth)
 *   /jobs/new               → JobFormView       (requiresAuth)
 *   /jobs/:id/edit          → JobFormView       (requiresAuth)
 *   /admin/*                → AdminLayout       (requiresAuth + requiresAdmin)
 *     ''                    → AdminDashboard
 *     users                 → AdminUsers
 *     users/:id             → AdminUserDetail
 *     jobs                  → AdminJobs
 *     jobs/:id              → AdminJobDetail
 *     audit-log             → AdminAuditLog
 *   /:pathMatch(.*)*        → NotFoundView      (404)
 */

import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true, title: 'Sign In' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true, title: 'Create Account' },
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('@/views/VerifyEmailView.vue'),
      meta: { title: 'Verify Email' },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { title: 'Forgot Password' },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: { title: 'Reset Password' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true, title: 'Dashboard' },
    },
    {
      path: '/jobs/new',
      name: 'job-new',
      component: () => import('@/views/JobFormView.vue'),
      meta: { requiresAuth: true, title: 'Add Job' },
    },
    {
      path: '/jobs/:id/edit',
      name: 'job-edit',
      component: () => import('@/views/JobFormView.vue'),
      meta: { requiresAuth: true, title: 'Edit Job' },
    },
    {
      path: '/admin',
      meta: { requiresAuth: true, requiresAdmin: true },
      component: () => import('@/views/admin/AdminLayout.vue'),
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/AdminDashboard.vue'),
          meta: { title: 'Admin — Overview' },
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/AdminUsers.vue'),
          meta: { title: 'Admin — Users' },
        },
        {
          path: 'users/:id',
          name: 'admin-user-detail',
          component: () => import('@/views/admin/AdminUserDetail.vue'),
          meta: { title: 'Admin — User Detail' },
        },
        {
          path: 'jobs',
          name: 'admin-jobs',
          component: () => import('@/views/admin/AdminJobs.vue'),
          meta: { title: 'Admin — Jobs' },
        },
        {
          path: 'jobs/:id',
          name: 'admin-job-detail',
          component: () => import('@/views/admin/AdminJobDetail.vue'),
          meta: { title: 'Admin — Job Detail' },
        },
        {
          path: 'audit-log',
          name: 'admin-audit-log',
          component: () => import('@/views/admin/AdminAuditLog.vue'),
          meta: { title: 'Admin — Audit Log' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Page Not Found' },
    },
  ],
});

/**
 * Global navigation guard that enforces route-level access control.
 * Runs before every route transition.
 *
 * @param to   - The target route being navigated to.
 * @param _from - The current route being navigated away from (unused).
 * @param next  - Callback to resolve the navigation (proceed, redirect, or abort).
 */
/** Updates the browser tab title after every navigation. */
router.afterEach((to) => {
  const pageTitle = to.meta.title as string | undefined;
  document.title = pageTitle ? `${pageTitle} | Pipeline` : 'Pipeline | Job Application Tracker';
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' });
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'dashboard' });
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
});

export default router;
