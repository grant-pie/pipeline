/**
 * query-users.dto.ts — Query parameters for GET /admin/users.
 * All fields are optional. sortBy is whitelisted to the columns supported
 * by AdminService.listUsers (jobCount is sorted in-memory).
 */
import { IsOptional, IsNumberString, IsString, IsIn } from 'class-validator';

export class QueryUsersDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['email', 'role', 'isSuspended', 'isVerified', 'jobCount', 'createdAt'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
