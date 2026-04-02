import { IsOptional, IsNumberString } from 'class-validator';

export class QueryAuditLogDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
