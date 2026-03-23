import { IsString, IsIn, IsOptional, IsDateString, IsNotEmpty, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { JobStatus } from '../entities/job.entity';

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

  @IsIn(['applied', 'interviewing', 'offered', 'rejected'])
  status: JobStatus;

  @IsOptional()
  @Transform(({ value }) => value?.trim() || undefined)
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsUrl({ require_protocol: false })
  @MaxLength(500)
  link?: string;
}
