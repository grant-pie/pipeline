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

export interface User {
  id: string;
  email: string;
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
