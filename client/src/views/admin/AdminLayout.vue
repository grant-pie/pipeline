<template>
  <div class="admin-shell">
    <AdminNav />
    <main class="admin-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * AdminLayout.vue — Admin section layout shell.
 *
 * Acts as the parent component for all /admin/* routes. Renders the AdminNav
 * sidebar on the left and a main content area on the right where nested route
 * components are mounted via RouterView.
 *
 * On mobile the layout switches from a side-by-side flex row to a column stack;
 * the sidebar becomes a slide-in drawer controlled by the useAdminNav composable.
 */
import AdminNav from '@/components/AdminNav.vue';
</script>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
}

.admin-content {
  flex: 1;
  padding: 40px 48px;
  min-width: 0;
}

@media (max-width: 768px) {
  .admin-shell {
    flex-direction: column;
  }

  .admin-content {
    padding: 40px 16px 24px;
  }
}
</style>
