<!--
  App.vue — Root application component.

  Serves as the top-level layout shell. Conditionally renders the NavBar only
  when the user is authenticated, then delegates all page content to RouterView.
  Every route's component is rendered inside the RouterView outlet.
-->
<template>
  <NavBar v-if="authStore.isAuthenticated" />
  <RouterView />
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import NavBar from '@/components/NavBar.vue';

// Access auth state to decide whether the NavBar should be visible.
const authStore = useAuthStore();
</script>
