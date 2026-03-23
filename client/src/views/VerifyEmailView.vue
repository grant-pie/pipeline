<template>
  <div class="auth-page">
    <div class="auth-card">

      <div v-if="state === 'loading'" class="status-state">
        <p class="status-title">Verifying your email…</p>
      </div>

      <div v-else-if="state === 'success'" class="status-state">
        <p class="status-title">Email verified</p>
        <p class="status-sub">Your account is now active. You can sign in.</p>
        <RouterLink to="/login" class="btn-primary submit-btn">Sign in</RouterLink>
      </div>

      <div v-else class="status-state">
        <p class="status-title">Invalid link</p>
        <p class="status-sub">This verification link is invalid or has already been used.</p>
        <RouterLink to="/login" class="btn-ghost btn-sm">Back to sign in</RouterLink>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { authApi } from '@/api/auth';

const route = useRoute();
const state = ref<'loading' | 'success' | 'error'>('loading');

onMounted(async () => {
  const token = route.query.token as string | undefined;
  if (!token) {
    state.value = 'error';
    return;
  }
  try {
    await authApi.verifyEmail(token);
    state.value = 'success';
  } catch {
    state.value = 'error';
  }
});
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 36px;
}

.status-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-title {
  font-size: 18px;
  font-weight: 600;
}

.status-sub {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.55;
  margin-bottom: 8px;
}

.submit-btn {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  text-align: center;
  text-decoration: none;
  display: block;
  border-radius: var(--radius);
}

.submit-btn:hover {
  text-decoration: none;
}
</style>
