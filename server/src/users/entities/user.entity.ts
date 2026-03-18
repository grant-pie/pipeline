import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  resetToken: string;

  @Column({ nullable: true, type: 'timestamptz' })
  resetTokenExpiry: Date;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Job, (job) => job.user)
  jobs: Job[];
}
