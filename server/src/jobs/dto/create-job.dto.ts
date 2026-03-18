import { IsString, IsIn, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { JobStatus } from '../entities/job.entity';

export class CreateJobDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Company name cannot be empty' })
  company: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Job title cannot be empty' })
  title: string;

  @IsDateString()
  dateApplied: string;

  @IsIn(['applied', 'interviewing', 'offered', 'rejected'])
  status: JobStatus;

  @IsOptional()
  @Transform(({ value }) => value?.trim() || undefined)
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  link?: string;
}
