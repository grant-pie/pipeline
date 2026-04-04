<template>
  <div class="admin-shell">

    <!-- Mobile top bar -->
    <div class="mobile-topbar">
      <button class="hamburger" @click="drawerOpen = true" aria-label="Open menu">
        <span /><span /><span />
      </button>
      <span class="mobile-title">Admin</span>
    </div>

    <!-- Backdrop -->
    <Transition name="backdrop">
      <div v-if="drawerOpen" class="backdrop" @click="drawerOpen = false" />
    </Transition>

    <!-- Sidebar / Drawer -->
    <nav class="admin-nav" :class="{ 'drawer-open': drawerOpen }">
      <div class="admin-nav-top">
        <RouterLink to="/dashboard" class="admin-brand" @click="drawerOpen = false">Pipeline</RouterLink>
        <span class="admin-badge">Admin</span>
        <button class="drawer-close" @click="drawerOpen = false" aria-label="Close menu">✕</button>
      </div>
      <ul class="admin-nav-links">
        <li>
          <RouterLink :to="{ name: 'admin-dashboard' }" class="nav-link" active-class="" :class="{ 'nav-link-active': isActive('admin-dashboard') }" @click="drawerOpen = false">
            Overview
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'admin-users' }" class="nav-link" active-class="" :class="{ 'nav-link-active': isActive('admin-users') }" @click="drawerOpen = false">
            Users
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'admin-jobs' }" class="nav-link" active-class="" :class="{ 'nav-link-active': isActive('admin-jobs') }" @click="drawerOpen = false">
            Jobs
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'admin-audit-log' }" class="nav-link" active-class="" :class="{ 'nav-link-active': isActive('admin-audit-log') }" @click="drawerOpen = false">
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
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const drawerOpen = ref(false);

// Close drawer on route change
watch(() => route.path, () => { drawerOpen.value = false; });

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

/* ─── Sidebar (desktop) ───────────────────────────────────────────────────── */
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

.admin-brand:hover { text-decoration: none; }

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

/* ─── Mobile-only elements (hidden on desktop) ───────────────────────────── */
.mobile-topbar,
.drawer-close,
.backdrop {
  display: none;
}

/* ─── Mobile ─────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .admin-shell {
    flex-direction: column;
  }

  /* Top bar */
  .mobile-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    height: 50px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: var(--navbar-height-mobile, 80px);
    z-index: 90;
    flex-shrink: 0;
  }

  .mobile-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  /* Hamburger */
  .hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    width: 32px;
  }

  .hamburger span {
    display: block;
    height: 2px;
    background: var(--text);
    border-radius: 2px;
    transition: background 0.15s;
  }

  /* Drawer */
  .admin-nav {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 110;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .admin-nav.drawer-open {
    transform: translateX(0);
  }

  .drawer-close {
    display: block;
    margin-left: auto;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 16px;
    cursor: pointer;
    padding: 2px 4px;
    line-height: 1;
  }

  .drawer-close:hover {
    color: var(--text);
  }

  /* Backdrop */
  .backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  .backdrop-enter-active, .backdrop-leave-active { transition: opacity 0.25s; }
  .backdrop-enter-from, .backdrop-leave-to { opacity: 0; }

  .admin-content {
    padding: 24px 16px;
  }
}
</style>
