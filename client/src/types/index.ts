export type JobStatus = 'applied' | 'interviewing' | 'offered' | 'rejected';

export interface JobApplication {
  id: string;
  company: string;
  title: string;
  dateApplied: string;
  status: JobStatus;
  notes?: string;
  link?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isSuspended: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface CreateJobDto {
  company: string;
  title: string;
  dateApplied: string;
  status: JobStatus;
  notes?: string;
  link?: string;
}

export type UpdateJobDto = Partial<CreateJobDto>;
