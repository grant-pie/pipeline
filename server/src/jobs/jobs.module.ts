/**
 * jobs.module.ts — Job applications feature module.
 *
 * Registers the Job entity repository and wires JobsService with JobsController.
 * All routes are protected by JwtAuthGuard applied at the controller level.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { Job } from './entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [JobsService],
  controllers: [JobsController],
})
export class JobsModule {}
