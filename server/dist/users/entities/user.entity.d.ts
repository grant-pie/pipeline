import { Job } from '../../jobs/entities/job.entity';
export declare class User {
    id: string;
    email: string;
    password: string;
    isVerified: boolean;
    verificationToken: string;
    resetToken: string;
    resetTokenExpiry: Date;
    createdAt: Date;
    jobs: Job[];
}
