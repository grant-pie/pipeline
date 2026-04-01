import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Job, JobStatus } from './entities/job.entity';

const USER_A = 'user-uuid-a';
const USER_B = 'user-uuid-b';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-uuid-1',
    company: 'Acme Corp',
    title: 'Software Engineer',
    dateApplied: '2024-03-01',
    status: 'applied' as JobStatus,
    notes: null,
    link: null,
    userId: USER_A,
    user: null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    ...overrides,
  } as Job;
}

describe('JobsService', () => {
  let service: JobsService;
  let qb: { where: jest.Mock; andWhere: jest.Mock; orderBy: jest.Mock; getMany: jest.Mock };
  let repo: {
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    repo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(Job), useValue: repo },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // findAll()
  // ---------------------------------------------------------------------------
  describe('findAll()', () => {
    it('returns paginated jobs belonging to the requesting user', async () => {
      const jobs = [makeJob(), makeJob({ id: 'job-uuid-2' })];
      repo.findAndCount.mockResolvedValue([jobs, 2]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { userId: USER_A },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toBe(jobs);
      expect(result.total).toBe(2);
    });

    it('returns an empty data array when the user has no jobs', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('orders results by createdAt DESC', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(USER_A, 1, 20);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });

    it('sets hasMore true when more pages exist', async () => {
      repo.findAndCount.mockResolvedValue([[makeJob()], 25]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(result.hasMore).toBe(true);
    });

    it('sets hasMore false on the last page', async () => {
      repo.findAndCount.mockResolvedValue([[makeJob()], 20]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(result.hasMore).toBe(false);
    });

    it('skips the correct number of records for page 2', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(USER_A, 2, 20);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findAll() — search
  // ---------------------------------------------------------------------------
  describe('findAll() with search', () => {
    it('uses the query builder instead of findAndCount when search is provided', async () => {
      qb.getMany.mockResolvedValue([makeJob()]);

      await service.findAll(USER_A, 1, 20, 'acme');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('job');
      expect(repo.findAndCount).not.toHaveBeenCalled();
    });

    it('scopes results to the requesting user', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll(USER_A, 1, 20, 'acme');

      expect(qb.where).toHaveBeenCalledWith('job.userId = :userId', { userId: USER_A });
    });

    it('returns hasMore: false regardless of result count', async () => {
      qb.getMany.mockResolvedValue([makeJob(), makeJob({ id: 'job-2' })]);

      const result = await service.findAll(USER_A, 1, 20, 'acme');

      expect(result.hasMore).toBe(false);
    });

    it('returns all matching results without pagination', async () => {
      const jobs = Array.from({ length: 30 }, (_, i) => makeJob({ id: `job-${i}` }));
      qb.getMany.mockResolvedValue(jobs);

      const result = await service.findAll(USER_A, 1, 20, 'engineer');

      expect(result.data).toHaveLength(30);
      expect(result.total).toBe(30);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne()
  // ---------------------------------------------------------------------------
  describe('findOne()', () => {
    it('returns the job when it exists and belongs to the user', async () => {
      const job = makeJob({ userId: USER_A });
      repo.findOne.mockResolvedValue(job);

      const result = await service.findOne(job.id, USER_A);

      expect(result).toBe(job);
    });

    it('queries by job id', async () => {
      const job = makeJob({ userId: USER_A });
      repo.findOne.mockResolvedValue(job);

      await service.findOne(job.id, USER_A);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: job.id } });
    });

    it('throws NotFoundException when job does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', USER_A)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when job belongs to a different user', async () => {
      const job = makeJob({ userId: USER_B });
      repo.findOne.mockResolvedValue(job);

      await expect(service.findOne(job.id, USER_A)).rejects.toThrow(ForbiddenException);
    });

    it('does not throw ForbiddenException for the job owner', async () => {
      const job = makeJob({ userId: USER_A });
      repo.findOne.mockResolvedValue(job);

      await expect(service.findOne(job.id, USER_A)).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // create()
  // ---------------------------------------------------------------------------
  describe('create()', () => {
    const dto = {
      company: 'Globex',
      title: 'Backend Engineer',
      dateApplied: '2024-04-01',
      status: 'applied' as JobStatus,
    };

    it('creates and saves a job with the correct userId attached', async () => {
      const builtJob = makeJob({ ...dto, userId: USER_A });
      const savedJob = { ...builtJob, id: 'new-uuid' };
      repo.create.mockReturnValue(builtJob);
      repo.save.mockResolvedValue(savedJob);

      const result = await service.create(dto, USER_A);

      expect(repo.create).toHaveBeenCalledWith({ ...dto, userId: USER_A });
      expect(repo.save).toHaveBeenCalledWith(builtJob);
      expect(result).toBe(savedJob);
    });

    it('persists all DTO fields onto the entity', async () => {
      const fullDto = {
        company: 'Initech',
        title: 'Dev',
        dateApplied: '2024-05-01',
        status: 'interviewing' as JobStatus,
        notes: 'Had a great call',
        link: 'https://initech.com/jobs/1',
      };
      repo.create.mockReturnValue({ ...fullDto, userId: USER_A });
      repo.save.mockResolvedValue({ ...fullDto, userId: USER_A, id: 'new-uuid' });

      await service.create(fullDto, USER_A);

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining(fullDto));
    });

    it('returns the saved job from the repository', async () => {
      const saved = makeJob({ userId: USER_A });
      repo.create.mockReturnValue(saved);
      repo.save.mockResolvedValue(saved);

      const result = await service.create(dto, USER_A);

      expect(result).toBe(saved);
    });
  });

  // ---------------------------------------------------------------------------
  // update()
  // ---------------------------------------------------------------------------
  describe('update()', () => {
    it('merges the partial DTO onto the existing job and saves it', async () => {
      const existing = makeJob({ userId: USER_A, status: 'applied' });
      repo.findOne.mockResolvedValue(existing);
      const updated = { ...existing, status: 'interviewing' as JobStatus };
      repo.save.mockResolvedValue(updated);

      const result = await service.update(existing.id, { status: 'interviewing' }, USER_A);

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'interviewing' }));
      expect(result).toBe(updated);
    });

    it('only mutates the fields supplied in the DTO', async () => {
      const existing = makeJob({ userId: USER_A, company: 'Acme', title: 'Engineer' });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (j) => j);

      await service.update(existing.id, { title: 'Senior Engineer' }, USER_A);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ company: 'Acme', title: 'Senior Engineer' }),
      );
    });

    it('throws NotFoundException when job does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { status: 'offered' }, USER_A),
      ).rejects.toThrow(NotFoundException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when job belongs to a different user', async () => {
      repo.findOne.mockResolvedValue(makeJob({ userId: USER_B }));

      await expect(
        service.update('job-uuid-1', { status: 'offered' }, USER_A),
      ).rejects.toThrow(ForbiddenException);

      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // remove()
  // ---------------------------------------------------------------------------
  describe('remove()', () => {
    it('removes the job when it exists and belongs to the user', async () => {
      const job = makeJob({ userId: USER_A });
      repo.findOne.mockResolvedValue(job);
      repo.remove.mockResolvedValue(undefined);

      await service.remove(job.id, USER_A);

      expect(repo.remove).toHaveBeenCalledWith(job);
    });

    it('throws NotFoundException when job does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id', USER_A)).rejects.toThrow(NotFoundException);

      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when job belongs to a different user', async () => {
      repo.findOne.mockResolvedValue(makeJob({ userId: USER_B }));

      await expect(service.remove('job-uuid-1', USER_A)).rejects.toThrow(ForbiddenException);

      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('returns void on success', async () => {
      const job = makeJob({ userId: USER_A });
      repo.findOne.mockResolvedValue(job);
      repo.remove.mockResolvedValue(undefined);

      const result = await service.remove(job.id, USER_A);

      expect(result).toBeUndefined();
    });
  });
});
