import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { QueryUsersDto } from './dto/query-users.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateJobDto } from '../jobs/dto/update-job.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Stats ────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Audit Log ────────────────────────────────────────────────────────────

  @Get('audit-log')
  getAuditLog(@Query() query: QueryAuditLogDto) {
    return this.adminService.getAuditLog(
      Math.max(1, parseInt(String(query.page ?? 1), 10)),
      Math.min(100, Math.max(1, parseInt(String(query.limit ?? 50), 10))),
      query.search?.trim() || undefined,
      query.sortBy || undefined,
      query.sortOrder || undefined,
    );
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  @Get('users')
  listUsers(@Query() query: QueryUsersDto) {
    return this.adminService.listUsers(
      Math.max(1, parseInt(String(query.page ?? 1), 10)),
      Math.min(100, Math.max(1, parseInt(String(query.limit ?? 20), 10))),
      query.search?.trim() || undefined,
      query.sortBy || undefined,
      query.sortOrder || undefined,
    );
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  setRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto, @Request() req) {
    return this.adminService.setRole({ id: req.user.id, email: req.user.email }, id, dto.role);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string, @Request() req) {
    return this.adminService.suspendUser({ id: req.user.id, email: req.user.email }, id);
  }

  @Patch('users/:id/unsuspend')
  unsuspendUser(@Param('id') id: string, @Request() req) {
    return this.adminService.unsuspendUser({ id: req.user.id, email: req.user.email }, id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteUser({ id: req.user.id, email: req.user.email }, id);
  }

  @Post('users/:id/verify')
  forceVerify(@Param('id') id: string, @Request() req) {
    return this.adminService.forceVerifyUser({ id: req.user.id, email: req.user.email }, id);
  }

  @Post('users/:id/resend-verification')
  resendVerification(@Param('id') id: string, @Request() req) {
    return this.adminService.resendVerification({ id: req.user.id, email: req.user.email }, id);
  }

  @Post('users/:id/reset-password')
  triggerPasswordReset(@Param('id') id: string, @Request() req) {
    return this.adminService.triggerPasswordReset({ id: req.user.id, email: req.user.email }, id);
  }

  // ─── Jobs ─────────────────────────────────────────────────────────────────

  @Get('jobs')
  listJobs(@Query() query: QueryJobsDto) {
    return this.adminService.listJobs(
      Math.max(1, parseInt(String(query.page ?? 1), 10)),
      Math.min(100, Math.max(1, parseInt(String(query.limit ?? 20), 10))),
      query.search?.trim() || undefined,
      query.userId || undefined,
      query.sortBy || undefined,
      query.sortOrder || undefined,
    );
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.adminService.getJob(id);
  }

  @Patch('jobs/:id')
  updateJob(@Param('id') id: string, @Body() dto: UpdateJobDto, @Request() req) {
    return this.adminService.updateJob(
      { id: req.user.id, email: req.user.email },
      id,
      dto as Partial<Record<string, unknown>>,
    );
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteJob(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteJob({ id: req.user.id, email: req.user.email }, id);
  }

  @Delete('jobs')
  bulkDeleteJobs(@Body('ids') ids: string[], @Request() req) {
    return this.adminService.bulkDeleteJobs({ id: req.user.id, email: req.user.email }, ids);
  }
}
