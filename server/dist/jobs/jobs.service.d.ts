import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
export declare class JobsService {
    private readonly jobsRepository;
    constructor(jobsRepository: Repository<Job>);
    findAll(userId: string): Promise<Job[]>;
    findOne(id: string, userId: string): Promise<Job>;
    create(dto: CreateJobDto, userId: string): Promise<Job>;
    update(id: string, dto: UpdateJobDto, userId: string): Promise<Job>;
    remove(id: string, userId: string): Promise<void>;
}
