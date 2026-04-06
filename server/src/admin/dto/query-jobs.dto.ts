/**
 * query-jobs.dto.ts — Query parameters for GET /admin/jobs.
 * All fields are optional. userId narrows results to a single user's jobs.
 * sortBy is whitelisted to the columns supported by AdminService.listJobs.
 */
import { IsOptional, IsNumberString, IsString, IsUUID, IsIn } from 'class-validator';

export class QueryJobsDto {
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
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsIn(['company', 'title', 'status', 'dateApplied', 'createdAt'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
