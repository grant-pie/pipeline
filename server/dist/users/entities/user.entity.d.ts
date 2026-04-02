import { Job } from '../../jobs/entities/job.entity';
export declare enum UserRole {
    USER = "user",
    ADMIN = "admin"
}
export declare class User {
    id: string;
    email: string;
    password: string;
    role: UserRole;
    isSuspended: boolean;
    isVerified: boolean;
    verificationToken: string;
    resetToken: string;
    resetTokenExpiry: Date;
    createdAt: Date;
    jobs: Job[];
}
