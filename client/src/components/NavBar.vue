<template>
  <nav class="navbar" :class="{ 'is-admin': isOnAdminPages }">
    <RouterLink to="/dashboard" class="brand">Pipeline</RouterLink>
    <div class="nav-right">
      <span class="nav-email">{{ authStore.user?.email }}</span>
      <div class="nav-actions">
        <RouterLink
          v-if="authStore.isAdmin"
          :to="isOnAdminPages ? { name: 'dashboard' } : { name: 'admin-dashboard' }"
          class="admin-link"
        >
          {{ isOnAdminPages ? 'Dashboard' : 'Admin' }}
        </RouterLink>
        <button class="btn-ghost btn-sm" @click="handleLogout">Sign out</button>
      </div>
    </div>
    <button v-if="isOnAdminPages" class="hamburger" @click="drawerOpen = !drawerOpen" aria-label="Toggle menu">
      <span /><span /><span />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAdminNav } from '@/composables/useAdminNav';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { drawerOpen } = useAdminNav();

const isOnAdminPages = computed(() => route.path.startsWith('/admin'));

function handleLogout() {
  authStore.logout();
  router.push({ name: 'login' });
}
</script>

<style scoped>
.navbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  height: auto;
  width: 100%;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;
  box-sizing: border-box;
}

.brand {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.4px;
  text-decoration: none;
}

.brand:hover {
  text-decoration: none;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-basis: 100%;
  justify-content: space-between;
  order: 2;
  padding-bottom: 4px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-email {
  font-size: 13px;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .navbar.is-admin {
    padding: 8px 16px;
    gap: 2px;
  }

  .navbar.is-admin .hamburger {
    margin-left: auto;
  }

  .navbar.is-admin .nav-right {
    gap: 12px;
    padding: 6px 0;
    border-top: 1px solid var(--border);
  }
}

.hamburger {
  display: none;
}

@media (max-width: 768px) {
  .hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 6px 8px;
    width: 36px;
    height: 36px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .hamburger span {
    display: block;
    height: 2px;
    background: var(--text);
    border-radius: 2px;
  }
}

.admin-link {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
  background: rgba(91, 138, 240, 0.1);
  border: 1px solid rgba(91, 138, 240, 0.2);
  border-radius: 4px;
  padding: 3px 9px;
  text-decoration: none;
  letter-spacing: 0.2px;
}

.admin-link:hover {
  background: rgba(91, 138, 240, 0.18);
  text-decoration: none;
}
</style>
