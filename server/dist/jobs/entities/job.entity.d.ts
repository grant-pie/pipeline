import { User } from '../../users/entities/user.entity';
export declare const JOB_STATUSES: readonly ["applied", "interviewing", "offered", "rejected"];
export type JobStatus = typeof JOB_STATUSES[number];
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
