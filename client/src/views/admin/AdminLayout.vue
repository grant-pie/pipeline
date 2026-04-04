<template>
  <div class="admin-shell">
    <AdminNav />
    <main class="admin-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
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
