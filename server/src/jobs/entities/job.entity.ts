/**
 * job.entity.ts — TypeORM entity for the `jobs` table.
 *
 * Represents a single job application belonging to a user. The status column
 * is a Postgres enum constrained to JOB_STATUSES. dateApplied is stored as a
 * plain `date` (no time component). Cascades delete from the owning user.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** Allowed status values for a job application. */
export const JOB_STATUSES = ['applied', 'interviewing', 'offered', 'rejected'] as const;
/** Union type derived from JOB_STATUSES for compile-time safety. */
export type JobStatus = typeof JOB_STATUSES[number];

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  company: string;

  @Column()
  title: string;

  @Column({ type: 'date' })
  dateApplied: string;

  @Column({
    type: 'enum',
    enum: JOB_STATUSES,
    default: 'applied',
  })
  status: JobStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  link: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
