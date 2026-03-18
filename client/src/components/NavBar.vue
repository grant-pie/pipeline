<template>
  <nav class="navbar">
    <RouterLink to="/dashboard" class="brand">Pipeline</RouterLink>
    <div class="nav-right">
      <span class="nav-email">{{ authStore.user?.email }}</span>
      <button class="btn-ghost btn-sm" @click="handleLogout">Sign out</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

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
  height: 54px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
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

.nav-email {
  font-size: 13px;
  color: var(--text-muted);
}
</style>
