import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly mailService;
    constructor(usersService: UsersService, jwtService: JwtService, mailService: MailService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            createdAt: Date;
        };
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    resendVerification(email: string): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
