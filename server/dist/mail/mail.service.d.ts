import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly config;
    private resend;
    constructor(config: ConfigService);
    sendVerificationEmail(email: string, token: string): Promise<void>;
    sendPasswordReset(email: string, token: string): Promise<void>;
}
