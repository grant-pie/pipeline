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
          <p class="auth-logo">Pipeline</p>
          <h1 class="auth-title">Choose a new password</h1>
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
            maxlength="128"
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
              minlength="8"
              maxlength="128"
              @input="checkPasswordMatch"
            />
          </div>

          <p v-if="passwordMatchError" class="error-msg">{{ passwordMatchError }}</p>
          <p v-else-if="error" class="error-msg">{{ error }}</p>

          <button type="submit" class="btn-primary submit-btn" :disabled="loading">
            {{ loading ? 'Saving…' : 'Set new password' }}
          </button>
        </form>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResetPasswordView.vue — Password reset completion page.
 *
 * Reads the one-time reset token from the ?token= URL query parameter and
 * renders one of three states:
 *   - Missing token: an error card with a link to request a new reset link.
 *   - Form: two password fields with debounced match validation.
 *   - Success: confirmation message with a link to /login.
 *
 * Password match is checked with 300 ms debounce on keystroke in the confirm
 * field and validated synchronously again on submit.
 */
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { authApi } from '@/api/auth';

const route = useRoute();
/** The one-time token from the ?token= query parameter, or undefined if absent. */
const token = route.query.token as string | undefined;

const password = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');
const passwordMatchError = ref('');
const submitted = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Validates the confirm field against the password field with a 300 ms debounce.
 * Called on every input event of the confirm field.
 */
function checkPasswordMatch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (confirm.value && password.value !== confirm.value) {
      passwordMatchError.value = 'Passwords do not match.';
    } else {
      passwordMatchError.value = '';
    }
  }, 300);
}

/**
 * Validates that the passwords match then submits the new password along with
 * the URL token to the reset-password API. On success switches to the
 * confirmation state; on failure shows the server error message.
 */
async function handleSubmit() {
  if (password.value !== confirm.value) {
    passwordMatchError.value = 'Passwords do not match.';
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
