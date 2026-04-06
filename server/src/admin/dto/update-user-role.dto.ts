/**
 * update-user-role.dto.ts — Request body for PATCH /admin/users/:id/role.
 * Validates that role is one of the values in the UserRole enum.
 */
import { IsEnum } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
