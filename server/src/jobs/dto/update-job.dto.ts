/**
 * update-job.dto.ts — Request body for PATCH /jobs/:id.
 * All CreateJobDto fields become optional via PartialType — only supplied
 * fields are updated; missing fields are left unchanged.
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreateJobDto } from './create-job.dto';

export class UpdateJobDto extends PartialType(CreateJobDto) {}
