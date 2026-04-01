import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Query, ForbiddenException } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { JOB_STATUSES } from './entities/job.entity';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  findAll(@Request() req) {
    return this.jobsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.jobsService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateJobDto, @Request() req) {
    return this.jobsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto, @Request() req) {
    return this.jobsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.jobsService.remove(id, req.user.id);
  }

  @Post('seed')
  async seedJobs(
    @Request() req,
    @Query('count') count = '10',
  ) {
    // 🔒 Prevent accidental use outside dev
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Seeding only allowed in development');
    }

    const total = Math.min(parseInt(count, 10) || 10, 100); // cap at 100
    const jobs = [];

    for (let i = 0; i < total; i++) {
      const dto = {
        company: faker.company.name().slice(0, 100),
        title: faker.person.jobTitle().slice(0, 100),
        dateApplied: faker.date
          .past({ years: 1 })
          .toISOString(),
        status: faker.helpers.arrayElement(JOB_STATUSES),
        notes: faker.datatype.boolean()
          ? faker.lorem.paragraph().slice(0, 2000)
          : undefined,
        link: faker.datatype.boolean()
          ? faker.internet.url().slice(0, 500)
          : undefined,
      };

      const job = await this.jobsService.create(dto, req.user.id);
      jobs.push(job);
    }

    return {
      message: `Created ${jobs.length} fake job applications`,
      count: jobs.length,
    };
  }
}
