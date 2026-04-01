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

export const JOB_STATUSES = ['applied', 'interviewing', 'offered', 'rejected'] as const;
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
