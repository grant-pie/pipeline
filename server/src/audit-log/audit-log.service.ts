import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';

export interface AuditEntry {
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  targetType: 'user' | 'job';
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  log(entry: AuditEntry): void {
    this.repo
      .save(this.repo.create(entry))
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to write audit log: ${entry.action}`,
          err instanceof Error ? err.stack : String(err),
        ),
      );
  }

  async findAll(page: number, limit: number) {
    const [data, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, hasMore: page * limit < total };
  }
}
