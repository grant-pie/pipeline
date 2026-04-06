<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <RouterLink to="/login" class="back-link">← Back to sign in</RouterLink>
        <h1 class="auth-logo">Pipeline</h1>
        <p class="auth-sub">Create your account</p>
      </div>

      <div v-if="submitted" class="success-state">
        <p class="success-title">Check your inbox</p>
        <p class="success-sub">
          We've sent a verification link to <strong>{{ submittedEmail }}</strong>.
          Click the link in the email to activate your account.
        </p>
        <RouterLink to="/login" class="btn-ghost btn-sm back-btn">Back to sign in</RouterLink>
      </div>

      <form v-else @submit.prevent="handleSubmit">
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
          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
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
            v-model="form.confirm"
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
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="auth-footer">
        Have an account? <RouterLink to="/login">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * RegisterView.vue — New user registration page.
 *
 * Renders a three-field form (email, password, confirm password). After a
 * successful API call the form is replaced by a success state prompting the
 * user to check their inbox for a verification email.
 *
 * Password match is checked with a 300 ms debounce on every keystroke in the
 * confirm field and again synchronously on submit, ensuring the error appears
 * quickly without firing on every single character while still catching
 * mismatches before the API call.
 *
 * The API error (e.g. duplicate email) is displayed separately from the
 * password-match error and is cleared whenever the user edits any field.
 */
import { ref, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({ email: '', password: '', confirm: '' });
const loading = ref(false);
const error = ref('');
const passwordMatchError = ref('');
const submitted = ref(false);
/** Stored separately so the success message can display it after the form clears. */
const submittedEmail = ref('');

// Clear the API error whenever the user modifies any field.
watch(form, () => { error.value = ''; });

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Validates the confirm field against the password field with a 300 ms debounce.
 * Called on every input event of the confirm field.
 */
function checkPasswordMatch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (form.confirm && form.password !== form.confirm) {
      passwordMatchError.value = 'Passwords do not match.';
    } else {
      passwordMatchError.value = '';
    }
  }, 300);
}

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
 * Validates both email format and password match, then calls the register API.
 * On success switches the view to the confirmation state.
 * On failure shows the server error message.
 */
async function handleSubmit() {
  if (!isValidEmail(form.email)) {
    error.value = 'Please enter a valid email address.';
    return;
  }
  if (form.password !== form.confirm) {
    passwordMatchError.value = 'Passwords do not match.';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await authStore.register(form.email, form.password);
    submittedEmail.value = form.email;
    submitted.value = true;
  } catch (e) {
    error.value = (e as Error).message || 'Registration failed';
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

.auth-sub {
  font-size: 14px;
  color: var(--text-muted);
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
