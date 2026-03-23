import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth';

// Mock the auth API so tests never hit a real server
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({
      accessToken: 'mock-token',
      user: { id: 'user-1', email: 'test@test.com', createdAt: '2026-01-01' },
    }),
    register: vi.fn().mockResolvedValue({ message: 'Account created.' }),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset Pinia and localStorage before each test
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('starts unauthenticated when localStorage is empty', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
  });

  it('sets token and user after login', async () => {
    const store = useAuthStore();
    await store.login('test@test.com', 'password123');
    expect(store.token).toBe('mock-token');
    expect(store.user?.email).toBe('test@test.com');
    expect(store.isAuthenticated).toBe(true);
  });

  it('persists token to localStorage after login', async () => {
    const store = useAuthStore();
    await store.login('test@test.com', 'password123');
    expect(localStorage.getItem('token')).toBe('mock-token');
  });

  it('clears token and user after logout', async () => {
    const store = useAuthStore();
    await store.login('test@test.com', 'password123');
    store.logout();
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it('removes token from localStorage after logout', async () => {
    const store = useAuthStore();
    await store.login('test@test.com', 'password123');
    store.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
