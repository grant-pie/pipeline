import router from '@/router';
import { getActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

const BASE_URL = '/api';
let hasHandledSessionExpiry = false;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleExpiredSession() {
  if (hasHandledSessionExpiry) return;
  hasHandledSessionExpiry = true;
  setTimeout(() => {
    hasHandledSessionExpiry = false;
  }, 1000);

  if (getActivePinia()) {
    useAuthStore().clearAuth();
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  router.push({ name: 'login', query: { reason: 'expired' } });
}

function normalizeErrorMessage(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  ) {
    const message = (value as { message: string }).message.trim();
    if (message) return message;
  }
  return 'Request failed. Please try again.';
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Network error. Please check your connection and try again.');
  }

  if (response.status === 401 && !endpoint.startsWith('/auth')) {
    handleExpiredSession();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(normalizeErrorMessage(error));
  }

  if (response.status === 204) return null as T;
  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
