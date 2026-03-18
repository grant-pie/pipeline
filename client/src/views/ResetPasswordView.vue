<template>
  <div class="auth-page">
    <div class="auth-card">

      <!-- Invalid/missing token -->
      <div v-if="!token" class="invalid-state">
        <p class="invalid-title">Invalid reset link</p>
        <p class="invalid-sub">This link is missing a reset token. Please request a new one.</p>
        <RouterLink to="/forgot-password" class="btn-ghost btn-sm">Request new link</RouterLink>
      </div>

      <!-- Success state -->
      <div v-else-if="submitted" class="success-state">
        <p class="success-title">Password updated</p>
        <p class="success-sub">Your password has been changed. You can now sign in.</p>
        <RouterLink to="/login" class="btn-primary submit-btn">Sign in</RouterLink>
      </div>

      <!-- Reset form -->
      <template v-else>
        <div class="auth-header">
          <h1 class="auth-logo">Pipeline</h1>
          <p class="auth-sub">Choose a new password for your account.</p>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="password">New password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Min. 8 characters"
              required
              autocomplete="new-password"
              minlength="8"
            />
          </div>

          <div class="form-group">
            <label for="confirm">Confirm password</label>
            <input
              id="confirm"
              v-model="confirm"
              type="password"
              placeholder="Repeat your password"
              required
              autocomplete="new-password"
            />
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>

          <button type="submit" class="btn-primary submit-btn" :disabled="loading">
            {{ loading ? 'Saving…' : 'Set new password' }}
          </button>
        </form>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { authApi } from '@/api/auth';

const route = useRoute();
const token = route.query.token as string | undefined;

const password = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');
const submitted = ref(false);

async function handleSubmit() {
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match.';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    await authApi.resetPassword(token!, password.value);
    submitted.value = true;
  } catch (e) {
    error.value = (e as Error).message || 'Invalid or expired reset link.';
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

.submit-btn {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  margin-top: 4px;
  text-align: center;
  text-decoration: none;
  display: block;
}

.submit-btn:hover {
  text-decoration: none;
}

.invalid-state,
.success-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invalid-title,
.success-title {
  font-size: 16px;
  font-weight: 600;
}

.invalid-sub,
.success-sub {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.55;
  margin-bottom: 8px;
}
</style>
