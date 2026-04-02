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

  it('does not crash when stored user JSON is malformed', () => {
    localStorage.setItem('token', 'bad-token');
    localStorage.setItem('user', '{bad json');

    const store = useAuthStore();
    expect(store.token).toBe('bad-token');
    expect(store.user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
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

  it('hydrates token from localStorage on initialisation', () => {
    localStorage.setItem('token', 'pre-existing-token');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'a@b.com', createdAt: '2026-01-01' }));
    const store = useAuthStore();
    expect(store.token).toBe('pre-existing-token');
    expect(store.isAuthenticated).toBe(true);
  });

  it('hydrates user from localStorage on initialisation', () => {
    const saved = { id: 'u1', email: 'a@b.com', createdAt: '2026-01-01' };
    localStorage.setItem('token', 'some-token');
    localStorage.setItem('user', JSON.stringify(saved));
    const store = useAuthStore();
    expect(store.user?.email).toBe('a@b.com');
  });

  it('clearAuth() removes state and localStorage directly', async () => {
    const store = useAuthStore();
    await store.login('test@test.com', 'password123');
    store.clearAuth();
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('login() propagates API errors to the caller', async () => {
    const { authApi } = await import('@/api/auth');
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error('Invalid credentials'));
    const store = useAuthStore();
    await expect(store.login('x@x.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });

  it('register() calls authApi.register with the correct arguments', async () => {
    const { authApi } = await import('@/api/auth');
    const store = useAuthStore();
    await store.register('new@example.com', 'password123');
    expect(authApi.register).toHaveBeenCalledWith('new@example.com', 'password123');
  });

  it('isAuthenticated is true after login and false after logout', async () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    await store.login('test@test.com', 'password123');
    expect(store.isAuthenticated).toBe(true);
    store.logout();
    expect(store.isAuthenticated).toBe(false);
  });

  // ── isAdmin ───────────────────────────────────────────────────────────────

  it('isAdmin is false when user is null', () => {
    const store = useAuthStore();
    expect(store.isAdmin).toBe(false);
  });

  it('isAdmin is false when user role is "user"', () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'a@b.com', role: 'user', createdAt: '2026-01-01' }));
    const store = useAuthStore();
    expect(store.isAdmin).toBe(false);
  });

  it('isAdmin is true when user role is "admin"', () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'a@b.com', role: 'admin', createdAt: '2026-01-01' }));
    const store = useAuthStore();
    expect(store.isAdmin).toBe(true);
  });

  it('isAdmin becomes false after logout', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'a@b.com', role: 'admin', createdAt: '2026-01-01' }));
    const store = useAuthStore();
    expect(store.isAdmin).toBe(true);
    store.logout();
    expect(store.isAdmin).toBe(false);
  });
});
