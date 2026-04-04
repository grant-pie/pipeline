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

  async findAll(userId: string, page: number, limit: number, search?: string, status?: string): Promise<{ data: Job[]; total: number; hasMore: boolean; statusCounts: Record<string, number> }> {
    // Base query scoped to user + optional search (no status filter) — used for counts
    const baseQb = this.jobsRepository
      .createQueryBuilder('job')
      .where('job.userId = :userId', { userId });

    if (search) {
      baseQb.andWhere(
        '(job.company ILIKE :search OR job.title ILIKE :search OR CAST(job."dateApplied" AS TEXT) ILIKE :search)',
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
        '(job.company ILIKE :search OR job.title ILIKE :search OR CAST(job."dateApplied" AS TEXT) ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      dataQb.andWhere('job.status = :status', { status });
    }

    if (search) {
      const data = await dataQb.getMany();
      return { data, total: data.length, hasMore: false, statusCounts };
    }

    dataQb.skip((page - 1) * limit).take(limit);
    const [data, total] = await dataQb.getManyAndCount();
    return { data, total, hasMore: page * limit < total, statusCounts };
  }

  async findOne(id: string, userId: string): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException();
    return job;
  }

  async create(dto: CreateJobDto, userId: string): Promise<Job> {
    const job = this.jobsRepository.create({ ...dto, userId });
    return this.jobsRepository.save(job);
  }

  async update(id: string, dto: UpdateJobDto, userId: string): Promise<Job> {
    const job = await this.findOne(id, userId);
    Object.assign(job, dto);
    return this.jobsRepository.save(job);
  }

  async remove(id: string, userId: string): Promise<void> {
    const job = await this.findOne(id, userId);
    await this.jobsRepository.remove(job);
  }
}
