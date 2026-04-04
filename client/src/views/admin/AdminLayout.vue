<template>
  <div class="admin-shell">
    <nav class="admin-nav">
      <div class="admin-nav-top">
        <RouterLink to="/dashboard" class="admin-brand">Pipeline</RouterLink>
        <span class="admin-badge">Admin</span>
      </div>
      <ul class="admin-nav-links">
        <li>
          <RouterLink :to="{ name: 'admin-dashboard' }" class="nav-link" active-class="" :class="{ 'nav-link-active': isActive('admin-dashboard') }">
            Overview
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'admin-users' }" class="nav-link" active-class="" :class="{ 'nav-link-active': isActive('admin-users') }">
            Users
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'admin-jobs' }" class="nav-link" active-class="" :class="{ 'nav-link-active': isActive('admin-jobs') }">
            Jobs
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'admin-audit-log' }" class="nav-link" active-class="" :class="{ 'nav-link-active': isActive('admin-audit-log') }">
            Audit Log
          </RouterLink>
        </li>
      </ul>
      <div class="admin-nav-footer">
        <span class="nav-email">{{ authStore.user?.email }}</span>
        <button class="btn-ghost btn-sm" @click="handleLogout">Sign out</button>
      </div>
    </nav>
    <main class="admin-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const SECTION_ROUTES: Record<string, string[]> = {
  'admin-dashboard': ['admin-dashboard'],
  'admin-users':     ['admin-users', 'admin-user-detail'],
  'admin-jobs':      ['admin-jobs', 'admin-job-detail'],
  'admin-audit-log': ['admin-audit-log'],
};

function isActive(section: string) {
  return SECTION_ROUTES[section]?.includes(route.name as string) ?? false;
}

function handleLogout() {
  authStore.logout();
  router.push({ name: 'login' });
}
</script>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
}

.admin-nav {
  width: 220px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.admin-nav-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
  padding: 0 8px;
}

.admin-brand {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  text-decoration: none;
  letter-spacing: -0.4px;
}

.admin-brand:hover {
  text-decoration: none;
}

.admin-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  background: rgba(91, 138, 240, 0.12);
  border: 1px solid rgba(91, 138, 240, 0.25);
  border-radius: 4px;
  padding: 2px 6px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.admin-nav-links {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.nav-link {
  display: block;
  padding: 8px 10px;
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--text-muted);
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
}

.nav-link:hover {
  background: var(--surface-2);
  color: var(--text);
  text-decoration: none;
}

.nav-link.nav-link-active {
  background: var(--surface-2);
  color: var(--text);
}

.admin-nav-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.nav-email {
  font-size: 12px;
  color: var(--text-muted);
  padding: 0 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-content {
  flex: 1;
  padding: 40px 48px;
  min-width: 0;
}
</style>
