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
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('@/views/VerifyEmailView.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/jobs/new',
      name: 'job-new',
      component: () => import('@/views/JobFormView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/jobs/:id/edit',
      name: 'job-edit',
      component: () => import('@/views/JobFormView.vue'),
      meta: { requiresAuth: true },
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
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/AdminUsers.vue'),
        },
        {
          path: 'users/:id',
          name: 'admin-user-detail',
          component: () => import('@/views/admin/AdminUserDetail.vue'),
        },
        {
          path: 'jobs',
          name: 'admin-jobs',
          component: () => import('@/views/admin/AdminJobs.vue'),
        },
        {
          path: 'audit-log',
          name: 'admin-audit-log',
          component: () => import('@/views/admin/AdminAuditLog.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
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
