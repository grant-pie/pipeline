import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { Job } from './jobs/entities/job.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'pipeline',
      entities: [User, Job],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    JobsModule,
    UsersModule,
  ],
})
export class AppModule {}
