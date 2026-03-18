import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(
    JSON.parse(localStorage.getItem('user') || 'null'),
  );

  const isAuthenticated = computed(() => !!token.value);

  function setAuth(accessToken: string, userData: User) {
    token.value = accessToken;
    user.value = userData;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    setAuth(response.accessToken, response.user);
  }

  async function register(email: string, password: string) {
    const response = await authApi.register(email, password);
    setAuth(response.accessToken, response.user);
  }

  function logout() {
    clearAuth();
  }

  return { token, user, isAuthenticated, login, register, logout };
});
