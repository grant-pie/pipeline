<template>
  <NavBar v-if="authStore.isAuthenticated" />
  <RouterView />
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import NavBar from '@/components/NavBar.vue';

const authStore = useAuthStore();
</script>
