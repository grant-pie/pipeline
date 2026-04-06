/**
 * api/auth.ts — Authentication API module.
 *
 * Wraps all /auth/* endpoints: registration, login, email verification,
 * and the two-step password-reset flow. Every method returns a Promise
 * that resolves with the JSON response body or rejects with a user-facing
 * error message (provided by the HTTP client layer).
 */

import { api } from './client';
import type { AuthResponse } from '@/types';

export const authApi = {
  /**
   * Registers a new user account. The account starts unverified; a
   * confirmation email is sent automatically by the server.
   *
   * @param email    - The user's email address.
   * @param password - The chosen password (min-length enforced server-side).
   * @returns A message confirming the registration email was sent.
   */
  register: (email: string, password: string) =>
    api.post<{ message: string }>('/auth/register', { email, password }),

  /**
   * Authenticates an existing user and returns a JWT plus user profile.
   *
   * @param email    - Registered email address.
   * @param password - Account password.
   * @returns An AuthResponse containing the JWT token and user object.
   */
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  /**
   * Verifies a user's email address using the one-time token from the
   * confirmation email link.
   *
   * @param token - The verification token extracted from the URL query string.
   * @returns A success message on valid token.
   */
  verifyEmail: (token: string) =>
    api.get<{ message: string }>(`/auth/verify-email?token=${token}`),

  /**
   * Re-sends the verification email to the given address. Used when the
   * original email expired or was lost.
   *
   * @param email - The address to re-send the verification link to.
   * @returns A message confirming the email was queued.
   */
  resendVerification: (email: string) =>
    api.post<{ message: string }>('/auth/resend-verification', { email }),

  /**
   * Initiates the forgot-password flow by sending a reset link to the
   * provided email address.
   *
   * @param email - The account email to send the reset link to.
   * @returns A message confirming the reset email was sent (always succeeds
   *          to prevent user enumeration).
   */
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  /**
   * Completes the password reset using the token from the reset email link
   * and the user's new chosen password.
   *
   * @param token    - The one-time reset token from the URL query string.
   * @param password - The new password to set on the account.
   * @returns A success message on valid token and password.
   */
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }),
};
