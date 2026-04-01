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

  async findAll(userId: string, page: number, limit: number): Promise<{ data: Job[]; total: number; hasMore: boolean }> {
    const [data, total] = await this.jobsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, hasMore: page * limit < total };
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
