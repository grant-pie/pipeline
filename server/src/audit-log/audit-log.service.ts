/**
 * audit-log.service.ts — Audit log persistence service.
 *
 * Provides two operations:
 *   log()     — fire-and-forget write used by AdminService after every mutating
 *               action; errors are caught and logged rather than surfaced to the
 *               caller so that an audit failure never blocks the primary action.
 *   findAll() — paginated, searchable, sortable read used by the audit log page.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';

/** Input shape for a new audit log entry. */
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

  /**
   * Persists an audit log entry asynchronously. Errors are swallowed so that
   * an audit write failure never causes the parent request to fail.
   *
   * @param entry - The audit entry data to persist.
   */
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

  /**
   * Returns a paginated list of audit log entries, optionally filtered by a
   * full-text search across admin email, action, target type/ID, and metadata.
   *
   * @param page      - 1-based page number.
   * @param limit     - Maximum records per page.
   * @param search    - Optional ILIKE filter applied across all text columns.
   * @param sortBy    - Column to order by (whitelisted; defaults to 'createdAt').
   * @param sortOrder - 'ASC' or 'DESC' (defaults to 'DESC').
   * @returns Paginated data, total count, and a hasMore flag.
   */
  async findAll(page: number, limit: number, search?: string, sortBy = 'createdAt', sortOrder: 'ASC' | 'DESC' = 'DESC') {
    const SORTABLE = new Set(['adminEmail', 'action', 'targetType', 'createdAt']);
    const sortCol = SORTABLE.has(sortBy) ? `log.${sortBy}` : 'log.createdAt';

    const qb = this.repo
      .createQueryBuilder('log')
      .orderBy(sortCol, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.where(
        `(
          log.adminEmail ILIKE :search OR
          log.action::text ILIKE :search OR
          log.targetType ILIKE :search OR
          log.targetId ILIKE :search OR
          log.metadata::text ILIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, hasMore: page * limit < total };
  }
}
