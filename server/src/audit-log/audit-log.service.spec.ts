import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLog, AuditAction } from './audit-log.entity';

function makeEntry(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'log-uuid-1',
    adminId: 'admin-uuid-1',
    adminEmail: 'admin@example.com',
    action: AuditAction.DELETE_USER,
    targetType: 'user',
    targetId: 'user-uuid-1',
    metadata: { targetEmail: 'victim@example.com' },
    createdAt: new Date('2024-01-01'),
    ...overrides,
  } as AuditLog;
}

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((entry) => entry),
      save: jest.fn().mockResolvedValue(makeEntry()),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useValue: repo },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // log()
  // ---------------------------------------------------------------------------
  describe('log()', () => {
    const entry = {
      adminId: 'admin-uuid-1',
      adminEmail: 'admin@example.com',
      action: AuditAction.DELETE_USER,
      targetType: 'user' as const,
      targetId: 'user-uuid-1',
      metadata: { targetEmail: 'victim@example.com' },
    };

    it('returns void synchronously — does not await the save', () => {
      const result = service.log(entry);
      expect(result).toBeUndefined();
    });

    it('calls repo.create with the entry fields', async () => {
      service.log(entry);
      await Promise.resolve(); // flush microtask queue

      expect(repo.create).toHaveBeenCalledWith(entry);
    });

    it('calls repo.save with the created entity', async () => {
      const created = { ...entry, id: 'new-uuid' };
      repo.create.mockReturnValue(created);

      service.log(entry);
      await Promise.resolve();

      expect(repo.save).toHaveBeenCalledWith(created);
    });

    it('does not throw when repo.save rejects — error is swallowed', async () => {
      repo.save.mockRejectedValue(new Error('DB connection lost'));

      expect(() => service.log(entry)).not.toThrow();

      // Allow the rejection to be handled by the .catch()
      await new Promise((r) => setTimeout(r, 0));
    });

    it('continues processing — save rejection does not propagate to caller', async () => {
      repo.save.mockRejectedValue(new Error('DB error'));
      let callerError: unknown = null;

      try {
        service.log(entry);
        await new Promise((r) => setTimeout(r, 0));
      } catch (e) {
        callerError = e;
      }

      expect(callerError).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll()
  // ---------------------------------------------------------------------------
  describe('findAll()', () => {
    it('queries with DESC order and correct skip/take for page 1', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 50);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });

    it('computes the correct skip for page 2', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(2, 50);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 }),
      );
    });

    it('returns data and total from the repository', async () => {
      const entries = [makeEntry(), makeEntry({ id: 'log-uuid-2' })];
      repo.findAndCount.mockResolvedValue([entries, 2]);

      const result = await service.findAll(1, 50);

      expect(result.data).toBe(entries);
      expect(result.total).toBe(2);
    });

    it('returns hasMore: true when more pages exist', async () => {
      repo.findAndCount.mockResolvedValue([[makeEntry()], 51]);

      const result = await service.findAll(1, 50);

      expect(result.hasMore).toBe(true);
    });

    it('returns hasMore: false on the last page', async () => {
      repo.findAndCount.mockResolvedValue([[makeEntry()], 50]);

      const result = await service.findAll(1, 50);

      expect(result.hasMore).toBe(false);
    });

    it('returns hasMore: false when there are no entries', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(1, 50);

      expect(result.hasMore).toBe(false);
    });
  });
});
