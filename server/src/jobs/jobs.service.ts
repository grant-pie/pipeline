/**
 * jobs.service.ts — Job application business logic service.
 *
 * All operations are scoped to the authenticated user — userId is always
 * required and enforced so that users can only read or mutate their own jobs.
 * The findAll query runs two separate query builders: one for per-status counts
 * (ignoring the active status filter) and one for the paginated data (including
 * the filter), so the status tab counts in the UI always reflect the full
 * dataset rather than only the filtered subset.
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
  ) {}

  /**
   * Returns a paginated list of the user's jobs with per-status counts.
   *
   * @param userId - UUID of the authenticated user.
   * @param page   - 1-based page number.
   * @param limit  - Records per page.
   * @param search - Optional ILIKE filter on company or title.
   * @param status - Optional exact-match filter on job status.
   * @returns Paginated jobs, total count, hasMore flag, and statusCounts map.
   */
  async findAll(userId: string, page: number, limit: number, search?: string, status?: string): Promise<{ data: Job[]; total: number; hasMore: boolean; statusCounts: Record<string, number> }> {
    // Base query scoped to user + optional search (no status filter) — used for counts
    const baseQb = this.jobsRepository
      .createQueryBuilder('job')
      .where('job.userId = :userId', { userId });

    if (search) {
      baseQb.andWhere(
        '(job.company ILIKE :search OR job.title ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const countsRaw = await baseQb
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.status')
      .getRawMany<{ status: string; count: string }>();

    const statusCounts: Record<string, number> = {};
    for (const row of countsRaw) {
      statusCounts[row.status] = parseInt(row.count, 10);
    }

    // Data query — adds status filter and pagination on top of base
    const dataQb = this.jobsRepository
      .createQueryBuilder('job')
      .where('job.userId = :userId', { userId })
      .orderBy('job.createdAt', 'DESC');

    if (search) {
      dataQb.andWhere(
        '(job.company ILIKE :search OR job.title ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      dataQb.andWhere('job.status = :status', { status });
    }

    dataQb.skip((page - 1) * limit).take(limit);
    const [data, total] = await dataQb.getManyAndCount();
    return { data, total, hasMore: page * limit < total, statusCounts };
  }

  /**
   * Fetches a single job and verifies it belongs to the requesting user.
   *
   * @param id     - UUID of the job.
   * @param userId - UUID of the authenticated user.
   * @returns The Job record.
   * @throws NotFoundException if the job doesn't exist.
   * @throws ForbiddenException if the job belongs to a different user.
   */
  async findOne(id: string, userId: string): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException();
    return job;
  }

  /**
   * Creates and persists a new job application for the given user.
   *
   * @param dto    - Validated creation payload from CreateJobDto.
   * @param userId - UUID of the authenticated user who owns the job.
   * @returns The newly created Job record.
   */
  async create(dto: CreateJobDto, userId: string): Promise<Job> {
    const job = this.jobsRepository.create({ ...dto, userId });
    return this.jobsRepository.save(job);
  }

  /**
   * Updates an existing job application after verifying ownership.
   *
   * @param id     - UUID of the job to update.
   * @param dto    - Partial update payload (only supplied fields are changed).
   * @param userId - UUID of the authenticated user (ownership check).
   * @returns The updated Job record.
   */
  async update(id: string, dto: UpdateJobDto, userId: string): Promise<Job> {
    const job = await this.findOne(id, userId);
    Object.assign(job, dto);
    return this.jobsRepository.save(job);
  }

  /**
   * Permanently deletes a job application after verifying ownership.
   *
   * @param id     - UUID of the job to delete.
   * @param userId - UUID of the authenticated user (ownership check).
   */
  async remove(id: string, userId: string): Promise<void> {
    const job = await this.findOne(id, userId);
    await this.jobsRepository.remove(job);
  }
}
