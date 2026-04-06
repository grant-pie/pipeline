/**
 * query-audit-log.dto.ts — Query parameters for GET /admin/audit-log.
 * All fields are optional. sortBy is whitelisted to the columns supported
 * by AuditLogService.findAll.
 */
import { IsOptional, IsNumberString, IsString, IsIn } from 'class-validator';

export class QueryAuditLogDto {
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
  @IsIn(['adminEmail', 'action', 'targetType', 'createdAt'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
