/**
 * jwt-auth.guard.ts — JWT authentication guard.
 *
 * Extends Passport's built-in 'jwt' strategy guard. Requires a valid Bearer
 * token in the Authorization header. On success, attaches the decoded user
 * payload (id, email, role) to request.user for use in route handlers.
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
