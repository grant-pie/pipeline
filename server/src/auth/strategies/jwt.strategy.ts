/**
 * jwt.strategy.ts — Passport JWT strategy.
 *
 * Extracts the Bearer token from the Authorization header, verifies it against
 * the validated JWT_SECRET, and calls validate() to build the request.user object
 * that route handlers receive via @Request() req.
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from '../jwt-secret.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(config),
    });
  }

  /**
   * Called by Passport after the token signature is verified.
   * The returned object becomes request.user in protected route handlers.
   *
   * @param payload - Decoded JWT claims (sub = user UUID, email, role).
   * @returns A plain user object attached to the request context.
   */
  async validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
