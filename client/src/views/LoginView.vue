<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <p class="auth-logo">Pipeline</p>
        <h1 class="auth-title">Sign in to your account</h1>
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
            maxlength="128"
          />
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-if="showResend" class="resend-msg">
          <button type="button" class="resend-btn" :disabled="resendLoading" @click="handleResend">
            {{ resendLoading ? 'Sending…' : 'Resend verification email' }}
          </button>
        </p>

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
/**
 * LoginView.vue — User sign-in page.
 *
 * Renders a simple email + password form. On success the user is redirected to
 * /dashboard. Handles two special cases:
 *   - Session expiry: shows a warning banner when ?reason=expired is in the URL
 *     (set by the HTTP client when a 401 is detected on a protected endpoint).
 *   - Unverified account: when the server returns an error containing "verify
 *     your email", a "Resend verification email" button is shown inline.
 *
 * Error state is cleared whenever the user modifies either form field.
 */
import { ref, reactive, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

/** True when the page was reached via a session-expiry redirect. */
const sessionExpired = computed(() => route.query.reason === 'expired');

const form = reactive({ email: '', password: '' });
const loading = ref(false);
const error = ref('');
const showResend = ref(false);
const resendLoading = ref(false);

// Clear error state whenever the user edits the form.
watch(form, () => {
  error.value = '';
  showResend.value = false;
});

/**
 * Returns true if the string resembles a valid email address.
 *
 * @param email - The raw string to validate.
 * @returns True when the string matches a basic email pattern.
 */
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates the form and submits login credentials to the auth store.
 * Redirects to /dashboard on success, or shows an error message on failure.
 * When the error indicates an unverified account, also shows the resend button.
 */
async function handleSubmit() {
  if (!isValidEmail(form.email)) {
    error.value = 'Please enter a valid email address.';
    return;
  }
  loading.value = true;
  error.value = '';
  showResend.value = false;
  try {
    await authStore.login(form.email, form.password);
    router.push({ name: 'dashboard' });
  } catch (e) {
    const msg = (e as Error).message || 'Invalid credentials';
    error.value = msg;
    if (msg.toLowerCase().includes('verify your email')) {
      showResend.value = true;
    }
  } finally {
    loading.value = false;
  }
}

/**
 * Re-sends the verification email to the address currently in the form.
 * Updates the error message to confirm success or failure.
 */
async function handleResend() {
  resendLoading.value = true;
  try {
    await authApi.resendVerification(form.email);
    error.value = 'Verification email sent. Please check your inbox.';
    showResend.value = false;
  } catch {
    error.value = 'Failed to resend. Please try again.';
  } finally {
    resendLoading.value = false;
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

.auth-title {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-muted);
  margin: 0;
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

.resend-msg {
  margin-top: 6px;
}

.resend-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
}

.resend-btn:hover {
  color: var(--accent-hover);
}
</style>
