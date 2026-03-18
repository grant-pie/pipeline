import { JobStatus } from '../entities/job.entity';
export declare class CreateJobDto {
    company: string;
    title: string;
    dateApplied: string;
    status: JobStatus;
    notes?: string;
    link?: string;
}
