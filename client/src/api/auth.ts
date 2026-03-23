import { api } from './client';
import type { AuthResponse } from '@/types';

export const authApi = {
  register: (email: string, password: string) =>
    api.post<{ message: string }>('/auth/register', { email, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  verifyEmail: (token: string) =>
    api.get<{ message: string }>(`/auth/verify-email?token=${token}`),

  resendVerification: (email: string) =>
    api.post<{ message: string }>('/auth/resend-verification', { email }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }),
};
