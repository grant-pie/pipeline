export declare class MailService {
    private resend;
    sendPasswordReset(email: string, token: string): Promise<void>;
}
