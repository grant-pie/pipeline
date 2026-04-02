import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

function makeContext(userRole?: string): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue(() => {}),
    getClass: jest.fn().mockReturnValue(class {}),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: userRole !== undefined ? { id: 'user-id', email: 'user@example.com', role: userRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns true when no roles metadata is set (unprotected route)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = makeContext(UserRole.USER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns true when the user role matches the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = makeContext(UserRole.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns false when the user role does not match the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = makeContext(UserRole.USER);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('returns false when req.user is undefined (no authenticated user)', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = makeContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('returns true when the user has one of multiple allowed roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.USER]);
    const context = makeContext(UserRole.USER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('reads metadata from handler and class using the ROLES_KEY', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = makeContext(UserRole.ADMIN);
    const handler = context.getHandler();
    const cls = context.getClass();

    guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [handler, cls]);
  });

  it('handler metadata takes precedence over class metadata (getAllAndOverride behaviour)', () => {
    // getAllAndOverride checks handler first; if set, class value is not used.
    // This test confirms we use getAllAndOverride, not getAllAndMerge.
    reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
    const context = makeContext(UserRole.USER);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
  });
});
