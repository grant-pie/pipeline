/**
 * stores/auth.ts — Authentication Pinia store.
 *
 * Manages the current user's session state: the JWT access token and the user
 * profile object. Both are persisted to localStorage so the session survives a
 * page refresh. On startup the store hydrates itself from localStorage.
 *
 * Exposes computed helpers (isAuthenticated, isAdmin) that drive route guards
 * and conditional UI rendering throughout the application.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import type { User } from '@/types';

/**
 * Reads and parses the stored user object from localStorage.
 * Returns null if the key is missing or the JSON is malformed (the malformed
 * entry is removed to prevent repeated parse failures).
 *
 * @returns The parsed User object, or null.
 */
function readStoredUser(): User | null {
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  // Hydrate from localStorage on store creation.
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(readStoredUser());

  /** True when a valid JWT is present in state. */
  const isAuthenticated = computed(() => !!token.value);

  /** True when the current user holds the 'admin' role. */
  const isAdmin = computed(() => user.value?.role === 'admin');

  /**
   * Persists the JWT and user profile to both reactive state and localStorage.
   *
   * @param accessToken - The JWT returned by the login endpoint.
   * @param userData    - The user profile returned by the login endpoint.
   */
  function setAuth(accessToken: string, userData: User) {
    token.value = accessToken;
    user.value = userData;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
  }

  /**
   * Clears all auth state from both reactive refs and localStorage.
   * Used on explicit logout and on session expiry (401 responses).
   */
  function clearAuth() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Calls the login API and persists the returned credentials on success.
   *
   * @param email    - The user's email address.
   * @param password - The user's password.
   * @throws Re-throws any API error for the calling component to handle.
   */
  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    setAuth(response.accessToken, response.user);
  }

  /**
   * Calls the register API. Does not log the user in — they must verify
   * their email first.
   *
   * @param email    - The desired email address.
   * @param password - The desired password.
   * @throws Re-throws any API error for the calling component to handle.
   */
  async function register(email: string, password: string) {
    await authApi.register(email, password);
  }

  /**
   * Clears auth state, effectively ending the user's session.
   * The router is responsible for redirecting to /login after calling this.
   */
  function logout() {
    clearAuth();
  }

  return { token, user, isAuthenticated, isAdmin, login, register, logout, clearAuth };
});
