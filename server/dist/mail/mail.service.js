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
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const resend_1 = require("resend");
let MailService = class MailService {
    constructor(config) {
        this.config = config;
        this.resend = new resend_1.Resend(this.config.get('RESEND_API_KEY'));
    }
    async sendPasswordReset(email, token) {
        const appUrl = this.config.get('APP_URL', 'http://localhost:5173');
        const resetUrl = `${appUrl}/reset-password?token=${token}`;
        const { error } = await this.resend.emails.send({
            from: process.env.MAIL_FROM || 'onboarding@resend.dev',
            to: email,
            subject: 'Reset your Pipeline password',
            html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="margin-bottom: 8px;">Reset your password</h2>
          <p style="color: #888; margin-bottom: 24px;">
            You requested a password reset for your Pipeline account.
            Click the button below to choose a new password.
            This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}"
            style="display: inline-block; background: #5b8af0; color: #fff;
                   padding: 10px 20px; border-radius: 6px; text-decoration: none;
                   font-weight: 500;">
            Reset password
          </a>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
        });
        if (error) {
            throw new common_1.InternalServerErrorException('Failed to send reset email.');
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map