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

  it('returns parsed JSON for a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'job-1' }),
      }),
    );
    const { api } = await import('./client');
    const result = await api.get('/jobs/job-1');
    expect(result).toEqual({ id: 'job-1' });
  });

  it('returns null for a 204 No Content response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
        json: vi.fn(),
      }),
    );
    const { api } = await import('./client');
    const result = await api.delete('/jobs/job-1');
    expect(result).toBeNull();
  });

  it('attaches the Authorization header when a token is in localStorage', async () => {
    localStorage.setItem('token', 'my-jwt-token');
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('./client');
    await api.get('/jobs');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer my-jwt-token');
    localStorage.clear();
  });

  it('does not attach an Authorization header when no token is present', async () => {
    localStorage.clear();
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('./client');
    await api.get('/jobs');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('does not redirect on 401 responses from /auth/* endpoints', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Unauthorized' }),
      }),
    );
    const { api } = await import('./client');
    await expect(api.post('/auth/login', {})).rejects.toThrow();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockClearAuth).not.toHaveBeenCalled();
  });

  it('throws with a string error message from the response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 400,
        ok: false,
        json: vi.fn().mockResolvedValue('Bad request string'),
      }),
    );
    const { api } = await import('./client');
    await expect(api.post('/auth/register', {})).rejects.toThrow('Bad request string');
  });

  it('throws with message field from an error response object', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 409,
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Email already in use' }),
      }),
    );
    const { api } = await import('./client');
    await expect(api.post('/auth/register', {})).rejects.toThrow('Email already in use');
  });

  it('throws a fallback message when the error body is not parseable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        json: vi.fn().mockRejectedValue(new Error('not json')),
      }),
    );
    const { api } = await import('./client');
    await expect(api.get('/jobs')).rejects.toThrow('The server is currently unavailable. Please try again later.');
  });
});
