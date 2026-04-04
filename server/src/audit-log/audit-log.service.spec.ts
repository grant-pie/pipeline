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
  let qb: Record<string, jest.Mock>;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  function makeQb() {
    const builder: Record<string, jest.Mock> = {};
    const chain = () => builder;
    ['orderBy', 'skip', 'take', 'where'].forEach(
      (m) => { builder[m] = jest.fn().mockReturnValue(chain()); },
    );
    builder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    return builder;
  }

  beforeEach(async () => {
    qb = makeQb();
    repo = {
      create: jest.fn().mockImplementation((entry) => entry),
      save: jest.fn().mockResolvedValue(makeEntry()),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
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
    it('orders by createdAt DESC and applies correct skip/take for page 1', async () => {
      await service.findAll(1, 50);

      expect(qb.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('computes the correct skip for page 2', async () => {
      await service.findAll(2, 50);

      expect(qb.skip).toHaveBeenCalledWith(50);
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('returns data and total from the repository', async () => {
      const entries = [makeEntry(), makeEntry({ id: 'log-uuid-2' })];
      qb.getManyAndCount.mockResolvedValue([entries, 2]);

      const result = await service.findAll(1, 50);

      expect(result.data).toBe(entries);
      expect(result.total).toBe(2);
    });

    it('returns hasMore: true when more pages exist', async () => {
      qb.getManyAndCount.mockResolvedValue([[makeEntry()], 51]);

      const result = await service.findAll(1, 50);

      expect(result.hasMore).toBe(true);
    });

    it('returns hasMore: false on the last page', async () => {
      qb.getManyAndCount.mockResolvedValue([[makeEntry()], 50]);

      const result = await service.findAll(1, 50);

      expect(result.hasMore).toBe(false);
    });

    it('returns hasMore: false when there are no entries', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(1, 50);

      expect(result.hasMore).toBe(false);
    });

    it('applies ILIKE search filter when search is provided', async () => {
      await service.findAll(1, 50, 'admin@');

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE :search'),
        { search: '%admin@%' },
      );
    });

    it('does not call where() when search is undefined', async () => {
      await service.findAll(1, 50, undefined);

      expect(qb.where).not.toHaveBeenCalled();
    });

    it('respects a custom sortBy column', async () => {
      await service.findAll(1, 50, undefined, 'adminEmail', 'ASC');

      expect(qb.orderBy).toHaveBeenCalledWith('log.adminEmail', 'ASC');
    });

    it('falls back to createdAt when an invalid sortBy is provided', async () => {
      await service.findAll(1, 50, undefined, 'injected; DROP TABLE', 'DESC');

      expect(qb.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC');
    });
  });
});
