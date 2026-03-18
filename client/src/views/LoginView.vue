<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1 class="auth-logo">Pipeline</h1>
        <p class="auth-sub">Sign in to your account</p>
      </div>

      <p v-if="sessionExpired" class="session-msg">Your session expired. Please sign in again.</p>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <div class="label-row">
            <label for="password">Password</label>
            <RouterLink to="/forgot-password" class="forgot-link">Forgot password?</RouterLink>
          </div>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="btn-primary submit-btn" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="auth-footer">
        No account? <RouterLink to="/register">Create one</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const sessionExpired = computed(() => route.query.reason === 'expired');

const form = reactive({ email: '', password: '' });
const loading = ref(false);
const error = ref('');

async function handleSubmit() {
  loading.value = true;
  error.value = '';
  try {
    await authStore.login(form.email, form.password);
    router.push({ name: 'dashboard' });
  } catch (e) {
    error.value = (e as Error).message || 'Invalid credentials';
  } finally {
    loading.value = false;
  }
}
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

.auth-header {
  margin-bottom: 28px;
}

.auth-logo {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}

.auth-sub {
  font-size: 14px;
  color: var(--text-muted);
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.label-row label {
  margin-bottom: 0;
}

.forgot-link {
  font-size: 12px;
  color: var(--text-muted);
}

.forgot-link:hover {
  color: var(--text);
}

.session-msg {
  font-size: 13px;
  color: var(--warning);
  background: rgba(224, 168, 61, 0.08);
  border: 1px solid rgba(224, 168, 61, 0.2);
  border-radius: var(--radius);
  padding: 8px 12px;
  margin-bottom: 16px;
}

.submit-btn {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  margin-top: 4px;
}

.auth-footer {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 20px;
}
</style>
