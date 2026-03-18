"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("./entities/job.entity");
let JobsService = class JobsService {
    constructor(jobsRepository) {
        this.jobsRepository = jobsRepository;
    }
    async findAll(userId) {
        return this.jobsRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id, userId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (job.userId !== userId)
            throw new common_1.ForbiddenException();
        return job;
    }
    async create(dto, userId) {
        const job = this.jobsRepository.create({ ...dto, userId });
        return this.jobsRepository.save(job);
    }
    async update(id, dto, userId) {
        const job = await this.findOne(id, userId);
        Object.assign(job, dto);
        return this.jobsRepository.save(job);
    }
    async remove(id, userId) {
        const job = await this.findOne(id, userId);
        await this.jobsRepository.remove(job);
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], JobsService);
//# sourceMappingURL=jobs.service.js.map