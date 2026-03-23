"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const users_service_1 = require("../users/users.service");
const mail_service_1 = require("../mail/mail.service");
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
let AuthService = class AuthService {
    constructor(usersService, jwtService, mailService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async register(dto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new common_1.ConflictException('Email already in use');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const user = await this.usersService.create(dto.email, hashedPassword, hashToken(verificationToken));
        await this.mailService.sendVerificationEmail(user.email, verificationToken);
        return { message: 'Account created. Please check your email to verify your account.' };
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordMatch = await bcrypt.compare(dto.password, user.password);
        if (!passwordMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isVerified) {
            throw new common_1.ForbiddenException('Please verify your email before signing in.');
        }
        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        return {
            accessToken: token,
            user: { id: user.id, email: user.email, createdAt: user.createdAt },
        };
    }
    async verifyEmail(token) {
        const user = await this.usersService.findByVerificationToken(hashToken(token));
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired verification link.');
        }
        await this.usersService.verifyUser(user.id);
        return { message: 'Email verified. You can now sign in.' };
    }
    async resendVerification(email) {
        const user = await this.usersService.findByEmail(email);
        if (user && !user.isVerified) {
            const token = crypto.randomBytes(32).toString('hex');
            await this.usersService.setVerificationToken(user.id, hashToken(token));
            await this.mailService.sendVerificationEmail(user.email, token);
        }
        return { message: 'If that email is registered and unverified, a new link has been sent.' };
    }
    async forgotPassword(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiry = new Date(Date.now() + 60 * 60 * 1000);
            await this.usersService.setResetToken(user.id, hashToken(token), expiry);
            await this.mailService.sendPasswordReset(user.email, token);
        }
        return { message: 'If that email is registered, a reset link has been sent.' };
    }
    async resetPassword(dto) {
        const user = await this.usersService.findByResetToken(hashToken(dto.token));
        if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired reset link.');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        await this.usersService.updatePassword(user.id, hashedPassword);
        return { message: 'Password updated successfully.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map