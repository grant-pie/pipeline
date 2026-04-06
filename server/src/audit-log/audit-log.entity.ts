/**
 * audit-log.entity.ts — TypeORM entity for the `audit_logs` table.
 *
 * Records every admin-initiated action for accountability. adminEmail is
 * denormalised (copied at write time) so audit history is preserved even if
 * the admin account is later deleted. metadata is stored as JSONB and carries
 * action-specific context (email address, company/title, count, etc.).
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/** All recordable admin action types. */
export enum AuditAction {
  SET_ROLE = 'SET_ROLE',
  SUSPEND_USER = 'SUSPEND_USER',
  UNSUSPEND_USER = 'UNSUSPEND_USER',
  DELETE_USER = 'DELETE_USER',
  FORCE_VERIFY = 'FORCE_VERIFY',
  RESEND_VERIFICATION = 'RESEND_VERIFICATION',
  TRIGGER_PASSWORD_RESET = 'TRIGGER_PASSWORD_RESET',
  UPDATE_JOB = 'UPDATE_JOB',
  DELETE_JOB = 'DELETE_JOB',
  BULK_DELETE_JOBS = 'BULK_DELETE_JOBS',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminId: string;

  // Denormalized — preserved even if the admin account is later deleted
  @Column()
  adminEmail: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column()
  targetType: string;

  // Nullable — not meaningful for bulk operations
  @Column({ nullable: true })
  targetId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
