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
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
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
    it('returns only jobs belonging to the requesting user', async () => {
      const jobs = [makeJob(), makeJob({ id: 'job-uuid-2' })];
      repo.find.mockResolvedValue(jobs);

      const result = await service.findAll(USER_A);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: USER_A },
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(jobs);
    });

    it('returns an empty array when the user has no jobs', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.findAll(USER_A);

      expect(result).toEqual([]);
    });

    it('orders results by createdAt DESC', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(USER_A);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
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
