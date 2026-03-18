import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    findAll(req: any): Promise<import("./entities/job.entity").Job[]>;
    findOne(id: string, req: any): Promise<import("./entities/job.entity").Job>;
    create(dto: CreateJobDto, req: any): Promise<import("./entities/job.entity").Job>;
    update(id: string, dto: UpdateJobDto, req: any): Promise<import("./entities/job.entity").Job>;
    remove(id: string, req: any): Promise<void>;
}
