import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobsController } from '../src/jobs/jobs.controller';
import { JobsService } from '../src/jobs/jobs.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { Job, JobStatus } from '../src/jobs/entities/job.entity';

const TEST_JWT_SECRET = 'test-jwt-secret-must-be-at-least-32-chars!!';
const USER_A_ID = 'user-uuid-a';
const USER_B_ID = 'user-uuid-b';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-uuid-1',
    company: 'Acme Corp',
    title: 'Software Engineer',
    dateApplied: '2024-03-01',
    status: 'applied' as JobStatus,
    notes: null,
    link: null,
    userId: USER_A_ID,
    user: null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    ...overrides,
  } as Job;
}

describe('Jobs endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let jobRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let tokenUserA: string;
  let tokenUserB: string;

  beforeEach(async () => {
    jobRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: TEST_JWT_SECRET,
          JWT_EXPIRES_IN: '1h',
        };
        return config[key] ?? defaultVal;
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [JobsController],
      providers: [
        JobsService,
        JwtStrategy,
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleRef.get<JwtService>(JwtService);
    tokenUserA = jwtService.sign({ sub: USER_A_ID, email: 'a@example.com' });
    tokenUserB = jwtService.sign({ sub: USER_B_ID, email: 'b@example.com' });
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // GET /jobs
  // ---------------------------------------------------------------------------
  describe('GET /jobs', () => {
    it('returns 200 with the authenticated user\'s jobs', async () => {
      const jobs = [makeJob(), makeJob({ id: 'job-uuid-2' })];
      jobRepo.find.mockResolvedValue(jobs);

      const res = await request(app.getHttpServer())
        .get('/jobs')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('returns 200 with an empty array when the user has no jobs', async () => {
      jobRepo.find.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/jobs')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('queries by the authenticated user\'s id', async () => {
      jobRepo.find.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/jobs')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(jobRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_A_ID } }),
      );
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer()).get('/jobs');
      expect(res.status).toBe(401);
    });

    it('returns 401 when the token is malformed', async () => {
      const res = await request(app.getHttpServer())
        .get('/jobs')
        .set('Authorization', 'Bearer not.a.real.token');

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /jobs
  // ---------------------------------------------------------------------------
  describe('POST /jobs', () => {
    const validBody = {
      company: 'Globex',
      title: 'Backend Engineer',
      dateApplied: '2024-04-01',
      status: 'applied',
    };

    it('returns 201 with the created job', async () => {
      const created = makeJob({ ...validBody, status: validBody.status as JobStatus, userId: USER_A_ID });
      jobRepo.create.mockReturnValue(created);
      jobRepo.save.mockResolvedValue(created);

      const res = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.company).toBe(validBody.company);
      expect(res.body.title).toBe(validBody.title);
    });

    it('attaches the authenticated user\'s id to the created job', async () => {
      const created = makeJob({ userId: USER_A_ID });
      jobRepo.create.mockReturnValue(created);
      jobRepo.save.mockResolvedValue(created);

      await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send(validBody);

      expect(jobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_A_ID }),
      );
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ company: 'Globex' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when status is not a valid enum value', async () => {
      const res = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ ...validBody, status: 'pending' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when dateApplied is not an ISO date string', async () => {
      const res = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ ...validBody, dateApplied: '01/04/2024' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when company is whitespace only', async () => {
      const res = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ ...validBody, company: '   ' });

      expect(res.status).toBe(400);
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/jobs')
        .send(validBody);

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /jobs/:id
  // ---------------------------------------------------------------------------
  describe('GET /jobs/:id', () => {
    it('returns 200 with the job when it belongs to the requesting user', async () => {
      const job = makeJob({ userId: USER_A_ID });
      jobRepo.findOne.mockResolvedValue(job);

      const res = await request(app.getHttpServer())
        .get(`/jobs/${job.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(job.id);
    });

    it('returns 403 when the job belongs to a different user', async () => {
      const job = makeJob({ userId: USER_B_ID });
      jobRepo.findOne.mockResolvedValue(job);

      const res = await request(app.getHttpServer())
        .get(`/jobs/${job.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 when the job does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/jobs/non-existent-id')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer()).get('/jobs/some-id');
      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /jobs/:id
  // ---------------------------------------------------------------------------
  describe('PATCH /jobs/:id', () => {
    it('returns 200 with the updated job on a valid partial update', async () => {
      const existing = makeJob({ userId: USER_A_ID });
      const updated = { ...existing, status: 'interviewing' as JobStatus };
      jobRepo.findOne.mockResolvedValue(existing);
      jobRepo.save.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch(`/jobs/${existing.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ status: 'interviewing' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('interviewing');
    });

    it('returns 400 when an invalid status is supplied', async () => {
      const res = await request(app.getHttpServer())
        .patch('/jobs/some-id')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ status: 'unknown-status' });

      expect(res.status).toBe(400);
    });

    it('returns 403 when the job belongs to a different user', async () => {
      jobRepo.findOne.mockResolvedValue(makeJob({ userId: USER_B_ID }));

      const res = await request(app.getHttpServer())
        .patch('/jobs/job-uuid-1')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ status: 'offered' });

      expect(res.status).toBe(403);
    });

    it('returns 404 when the job does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .patch('/jobs/non-existent-id')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ status: 'offered' });

      expect(res.status).toBe(404);
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer())
        .patch('/jobs/some-id')
        .send({ status: 'offered' });

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /jobs/:id
  // ---------------------------------------------------------------------------
  describe('DELETE /jobs/:id', () => {
    it('returns 204 with no body when deletion succeeds', async () => {
      const job = makeJob({ userId: USER_A_ID });
      jobRepo.findOne.mockResolvedValue(job);
      jobRepo.remove.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .delete(`/jobs/${job.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it('calls repository.remove with the correct job entity', async () => {
      const job = makeJob({ userId: USER_A_ID });
      jobRepo.findOne.mockResolvedValue(job);
      jobRepo.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/jobs/${job.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(jobRepo.remove).toHaveBeenCalledWith(job);
    });

    it('returns 403 when the job belongs to a different user', async () => {
      jobRepo.findOne.mockResolvedValue(makeJob({ userId: USER_B_ID }));

      const res = await request(app.getHttpServer())
        .delete('/jobs/job-uuid-1')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 when the job does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete('/jobs/non-existent-id')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer()).delete('/jobs/some-id');
      expect(res.status).toBe(401);
    });
  });
});
