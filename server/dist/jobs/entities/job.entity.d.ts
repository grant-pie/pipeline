import { User } from '../../users/entities/user.entity';
export type JobStatus = 'applied' | 'interviewing' | 'offered' | 'rejected';
export declare class Job {
    id: string;
    company: string;
    title: string;
    dateApplied: string;
    status: JobStatus;
    notes: string;
    link: string;
    userId: string;
    user: User;
    createdAt: Date;
    updatedAt: Date;
}
