/**
 * types/index.ts — Shared TypeScript types and interfaces.
 *
 * Central location for domain types used across components, stores, and API
 * modules. Keeping them here avoids circular imports and ensures consistent
 * shapes throughout the application.
 */

/** The four possible statuses a job application can have. */
export type JobStatus = 'applied' | 'interviewing' | 'offered' | 'rejected';

/** A single job application record as returned by the jobs API. */
export interface JobApplication {
  id: string;
  company: string;
  title: string;
  /** ISO date string (YYYY-MM-DD) for when the application was submitted. */
  dateApplied: string;
  status: JobStatus;
  /** Optional free-text notes about the application. */
  notes?: string;
  /** Optional URL to the original job posting. */
  link?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/** The two roles a user account can hold. */
export type UserRole = 'user' | 'admin';

/** A user account record as stored in auth state. */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  isSuspended: boolean;
  createdAt: string;
}

/** Shape returned by the login endpoint. */
export interface AuthResponse {
  /** JWT used as the Bearer token on subsequent requests. */
  accessToken: string;
  user: User;
}

/** Payload required to create a new job application. */
export interface CreateJobDto {
  company: string;
  title: string;
  /** ISO date string (YYYY-MM-DD). */
  dateApplied: string;
  status: JobStatus;
  notes?: string;
  link?: string;
}

/** All fields are optional for partial updates. */
export type UpdateJobDto = Partial<CreateJobDto>;
