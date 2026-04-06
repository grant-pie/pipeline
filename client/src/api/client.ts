/**
 * api/client.ts — Core HTTP client.
 *
 * Provides a thin wrapper around the Fetch API that handles:
 *   - Attaching the JWT Authorization header from localStorage on every request.
 *   - Detecting 401 responses on non-auth endpoints and redirecting to the
 *     login page with a session-expired query parameter (deduplicated so only
 *     one redirect fires even when multiple requests fail simultaneously).
 *   - Parsing error responses into human-readable messages with sensible
 *     HTTP-status-based fallbacks.
 *   - Returning null for 204 No Content responses.
 *
 * All API modules (auth, jobs, admin) import and use this client.
 */

import router from '@/router';
import { getActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

const BASE_URL = '/api';

/** Guards against firing multiple session-expiry redirects in parallel. */
let hasHandledSessionExpiry = false;

/**
 * Reads the JWT from localStorage and builds an Authorization header.
 *
 * @returns An object with an Authorization Bearer header, or an empty object
 *          when no token is present.
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Clears auth state and redirects the user to /login?reason=expired.
 * Debounces itself so that concurrent 401 responses only trigger one redirect.
 */
function handleExpiredSession() {
  if (hasHandledSessionExpiry) return;
  hasHandledSessionExpiry = true;
  setTimeout(() => {
    hasHandledSessionExpiry = false;
  }, 1000);

  // Clear auth via Pinia store if available, otherwise fall back to localStorage.
  if (getActivePinia()) {
    useAuthStore().clearAuth();
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  router.push({ name: 'login', query: { reason: 'expired' } });
}

/**
 * Extracts a user-facing error message from an unknown API response body,
 * falling back to HTTP-status-specific strings when no message can be parsed.
 *
 * @param value  - The raw parsed response body (may be any shape).
 * @param status - The HTTP status code, used for fallback messages.
 * @returns A non-empty human-readable error string.
 */
function normalizeErrorMessage(value: unknown, status?: number): string {
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
  if (status !== undefined) {
    if (status >= 500) return 'The server is currently unavailable. Please try again later.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 400) return 'Invalid request. Please check your input and try again.';
  }
  return 'Request failed. Please try again.';
}

/**
 * Sends an HTTP request to the API and returns the parsed JSON response.
 *
 * @param endpoint - Path relative to the API base URL (e.g. '/jobs/1').
 * @param options  - Standard RequestInit options (method, body, headers, etc.).
 * @returns The parsed JSON response body cast to type T, or null for 204s.
 * @throws An Error with a user-facing message on network failure or non-2xx status.
 */
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

  // 401 on non-auth endpoints means the session has expired.
  if (response.status === 401 && !endpoint.startsWith('/auth')) {
    handleExpiredSession();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(normalizeErrorMessage(error, response.status));
  }

  if (response.status === 204) return null as T;
  return response.json();
}

/** Convenience methods for each HTTP verb used in the application. */
export const api = {
  /** @param endpoint - API path. @returns Parsed response body. */
  get: <T>(endpoint: string) => request<T>(endpoint),

  /**
   * @param endpoint - API path.
   * @param body     - Request payload (serialised to JSON).
   * @returns Parsed response body.
   */
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  /**
   * @param endpoint - API path.
   * @param body     - Partial update payload (serialised to JSON).
   * @returns Parsed response body.
   */
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

  /**
   * @param endpoint - API path.
   * @param body     - Optional request payload for bulk operations.
   * @returns Parsed response body.
   */
  delete: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
};
