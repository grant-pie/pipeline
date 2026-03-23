import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockPush = vi.fn();
const mockClearAuth = vi.fn();

vi.mock('@/router', () => ({
  default: { push: mockPush },
}));

vi.mock('pinia', () => ({
  getActivePinia: vi.fn(() => ({})),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    clearAuth: mockClearAuth,
  })),
}));

describe('api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('clears auth store and redirects on non-auth 401 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Unauthorized' }),
      }),
    );

    const { api } = await import('./client');

    await expect(api.get('/jobs')).rejects.toThrow('Session expired. Please sign in again.');
    expect(mockClearAuth).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ name: 'login', query: { reason: 'expired' } });
  });

  it('deduplicates repeated session-expired redirects within a short window', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Unauthorized' }),
      }),
    );

    const { api } = await import('./client');

    await expect(Promise.allSettled([api.get('/jobs'), api.get('/jobs')])).resolves.toBeTruthy();
    expect(mockClearAuth).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('returns a friendly message for network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const { api } = await import('./client');
    await expect(api.get('/jobs')).rejects.toThrow(
      'Network error. Please check your connection and try again.',
    );
  });
});
