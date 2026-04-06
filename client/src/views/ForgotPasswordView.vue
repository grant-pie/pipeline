<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <RouterLink to="/login" class="back-link">← Back to sign in</RouterLink>
        <p class="auth-logo">Pipeline</p>
        <h1 class="auth-title">Reset your password</h1>
      </div>

      <form v-if="!submitted" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="btn-primary submit-btn" :disabled="loading">
          {{ loading ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>

      <div v-else class="success-state">
        <p class="success-title">Check your inbox</p>
        <p class="success-sub">
          If that email is registered, a reset link has been sent.
          Check your spam folder if you don't see it.
        </p>
        <RouterLink to="/login" class="btn-ghost btn-sm back-btn">Back to sign in</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ForgotPasswordView.vue — Password reset request page.
 *
 * Presents a single email field. On submission it calls the forgot-password API
 * endpoint which sends a reset link to the address if it belongs to a registered
 * account. The response is always treated as a success (the API intentionally
 * avoids revealing whether an email is registered) and the form is replaced by
 * a confirmation message. Only actual network or server errors are surfaced.
 */
import { ref } from 'vue';
import { authApi } from '@/api/auth';

const email = ref('');
const loading = ref(false);
const error = ref('');
const submitted = ref(false);

/**
 * Submits the email to the forgot-password API and switches to the success state.
 * Network or server errors are displayed inline.
 */
async function handleSubmit() {
  loading.value = true;
  error.value = '';
  try {
    await authApi.forgotPassword(email.value);
    submitted.value = true;
  } catch (e) {
    error.value = (e as Error).message || 'Something went wrong. Please try again.';
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

.back-link {
  display: inline-block;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
  text-decoration: none;
}

.back-link:hover {
  color: var(--text);
  text-decoration: none;
}

.auth-logo {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}

.auth-title {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-muted);
  margin: 0;
}

.submit-btn {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  margin-top: 4px;
}

.success-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.success-title {
  font-size: 16px;
  font-weight: 600;
}

.success-sub {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.55;
  margin-bottom: 8px;
}

.back-btn {
  align-self: flex-start;
  text-decoration: none;
}

.back-btn:hover {
  text-decoration: none;
}
</style>
