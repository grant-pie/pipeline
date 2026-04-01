import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('./client', () => ({
  api: { get: mockGet, post: mockPost },
}));

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('register() calls api.post with the correct endpoint and body', async () => {
    mockPost.mockResolvedValue({ message: 'Account created.' });
    const { authApi } = await import('./auth');
    await authApi.register('user@example.com', 'password123');
    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      email: 'user@example.com',
      password: 'password123',
    });
  });

  it('login() calls api.post with the correct endpoint and body', async () => {
    mockPost.mockResolvedValue({ accessToken: 'token', user: {} });
    const { authApi } = await import('./auth');
    await authApi.login('user@example.com', 'password123');
    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'user@example.com',
      password: 'password123',
    });
  });

  it('verifyEmail() calls api.get with the token as a query param', async () => {
    mockGet.mockResolvedValue({ message: 'Verified.' });
    const { authApi } = await import('./auth');
    await authApi.verifyEmail('my-token');
    expect(mockGet).toHaveBeenCalledWith('/auth/verify-email?token=my-token');
  });

  it('resendVerification() calls api.post with the correct endpoint and body', async () => {
    mockPost.mockResolvedValue({ message: 'Sent.' });
    const { authApi } = await import('./auth');
    await authApi.resendVerification('user@example.com');
    expect(mockPost).toHaveBeenCalledWith('/auth/resend-verification', {
      email: 'user@example.com',
    });
  });

  it('forgotPassword() calls api.post with the correct endpoint and body', async () => {
    mockPost.mockResolvedValue({ message: 'Sent.' });
    const { authApi } = await import('./auth');
    await authApi.forgotPassword('user@example.com');
    expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'user@example.com',
    });
  });

  it('resetPassword() calls api.post with the correct endpoint and body', async () => {
    mockPost.mockResolvedValue({ message: 'Password updated.' });
    const { authApi } = await import('./auth');
    await authApi.resetPassword('reset-token', 'newpassword123');
    expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'reset-token',
      password: 'newpassword123',
    });
  });
});
