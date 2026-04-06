/**
 * roles.guard.ts — Role-based access control guard.
 *
 * Reads the roles metadata set by the @Roles() decorator on the route handler
 * or its controller class. If no roles are required the request is allowed
 * through. Otherwise the guard checks that request.user.role is included in
 * the required roles array.
 *
 * Must be used after JwtAuthGuard so that request.user is already populated.
 */
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Returns true when the authenticated user's role satisfies the @Roles() requirement.
   *
   * @param context - NestJS execution context providing access to the HTTP request.
   * @returns true if access should be granted, false to send a 403 response.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
