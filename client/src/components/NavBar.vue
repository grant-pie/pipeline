<template>
  <nav class="navbar">
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
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isOnAdminPages = computed(() => route.path.startsWith('/admin'));

function handleLogout() {
  authStore.logout();
  router.push({ name: 'login' });
}
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: var(--navbar-height, 54px);
  width: 100%;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
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

@media (max-width: 480px) {
  .nav-right {
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    padding: 8px 0;
  }

  .navbar {
    height: auto;
    padding: 10px 24px;
  }

  :global(#app) {
    padding-top: var(--navbar-height-mobile, 80px);
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
