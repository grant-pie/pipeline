import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly config;
    private resend;
    constructor(config: ConfigService);
    sendPasswordReset(email: string, token: string): Promise<void>;
}
