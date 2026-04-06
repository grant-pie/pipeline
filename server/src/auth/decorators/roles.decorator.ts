/**
 * roles.decorator.ts — @Roles() route decorator.
 *
 * Attaches a roles metadata array to a route handler or controller class.
 * RolesGuard reads this metadata to enforce access control.
 *
 * @example @Roles(UserRole.ADMIN)
 */
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

/** Metadata key used to store required roles on a route handler. */
export const ROLES_KEY = 'roles';

/**
 * Decorator that marks a route as requiring one or more specific roles.
 *
 * @param roles - One or more UserRole values that are permitted to access the route.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
