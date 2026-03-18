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

export type JobStatus = 'applied' | 'interviewing' | 'offered' | 'rejected';

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
    enum: ['applied', 'interviewing', 'offered', 'rejected'],
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
