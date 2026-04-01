import { IsString, IsIn, IsOptional, IsDateString, IsNotEmpty, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { JobStatus, JOB_STATUSES } from '../entities/job.entity';

export class CreateJobDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Company name cannot be empty' })
  @MaxLength(100)
  company: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Job title cannot be empty' })
  @MaxLength(100)
  title: string;

  @IsDateString()
  dateApplied: string;

  @IsIn(JOB_STATUSES)
  status: JobStatus;

  @IsOptional()
  @Transform(({ value }) => value?.trim() || undefined)
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsUrl({ require_tld: true, protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  link?: string;
}
