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
  let qb: Record<string, jest.Mock>;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  function makeQb() {
    const builder: Record<string, jest.Mock> = {};
    const chain = () => builder;
    ['where', 'andWhere', 'orderBy', 'skip', 'take', 'select', 'addSelect', 'groupBy'].forEach(
      (m) => { builder[m] = jest.fn().mockReturnValue(chain()); },
    );
    builder.getRawMany = jest.fn().mockResolvedValue([]);
    builder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    return builder;
  }

  beforeEach(async () => {
    qb = makeQb();
    repo = {
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
      qb.getManyAndCount.mockResolvedValue([jobs, 2]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(result.data).toBe(jobs);
      expect(result.total).toBe(2);
    });

    it('scopes both query builders to the requesting user', async () => {
      await service.findAll(USER_A, 1, 20);

      expect(qb.where).toHaveBeenCalledWith('job.userId = :userId', { userId: USER_A });
    });

    it('returns an empty data array when the user has no jobs', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('orders results by createdAt DESC', async () => {
      await service.findAll(USER_A, 1, 20);

      expect(qb.orderBy).toHaveBeenCalledWith('job.createdAt', 'DESC');
    });

    it('sets hasMore true when more pages exist', async () => {
      qb.getManyAndCount.mockResolvedValue([[makeJob()], 25]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(result.hasMore).toBe(true);
    });

    it('sets hasMore false on the last page', async () => {
      qb.getManyAndCount.mockResolvedValue([[makeJob()], 20]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(result.hasMore).toBe(false);
    });

    it('skips the correct number of records for page 2', async () => {
      await service.findAll(USER_A, 2, 20);

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('returns statusCounts parsed from getRawMany', async () => {
      qb.getRawMany.mockResolvedValue([
        { status: 'applied', count: '3' },
        { status: 'offered', count: '1' },
      ]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(result.statusCounts).toEqual({ applied: 3, offered: 1 });
    });

    it('returns empty statusCounts when user has no jobs', async () => {
      qb.getRawMany.mockResolvedValue([]);

      const result = await service.findAll(USER_A, 1, 20);

      expect(result.statusCounts).toEqual({});
    });

    it('filters by status when status param is provided', async () => {
      await service.findAll(USER_A, 1, 20, undefined, 'applied');

      expect(qb.andWhere).toHaveBeenCalledWith('job.status = :status', { status: 'applied' });
    });
  });

  // ---------------------------------------------------------------------------
  // findAll() — search
  // ---------------------------------------------------------------------------
  describe('findAll() with search', () => {
    it('uses the query builder when search is provided', async () => {
      await service.findAll(USER_A, 1, 20, 'acme');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('job');
    });

    it('applies ILIKE search on company and title', async () => {
      await service.findAll(USER_A, 1, 20, 'acme');

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(job.company ILIKE :search OR job.title ILIKE :search)',
        { search: '%acme%' },
      );
    });

    it('still paginates results when search is provided', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => makeJob({ id: `job-${i}` }));
      qb.getManyAndCount.mockResolvedValue([jobs, 30]);

      const result = await service.findAll(USER_A, 2, 5, 'engineer');

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(30);
    });

    it('applies status filter together with search', async () => {
      await service.findAll(USER_A, 1, 20, 'acme', 'interviewing');

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(job.company ILIKE :search OR job.title ILIKE :search)',
        { search: '%acme%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('job.status = :status', { status: 'interviewing' });
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
