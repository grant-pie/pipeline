import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    isVerified: false,
    verificationToken: 'hashed-verification-token',
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date('2024-01-01'),
    jobs: [],
    ...overrides,
  } as User;
}

describe('UsersService', () => {
  let service: UsersService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // findByEmail()
  // ---------------------------------------------------------------------------
  describe('findByEmail()', () => {
    it('returns the user when the email exists', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      const result = await service.findByEmail(user.email);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { email: user.email } });
      expect(result).toBe(user);
    });

    it('returns null when the email does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nobody@example.com');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findById()
  // ---------------------------------------------------------------------------
  describe('findById()', () => {
    it('returns the user when the id exists', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      const result = await service.findById(user.id);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(result).toBe(user);
    });

    it('returns null when the id does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-uuid');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // create()
  // ---------------------------------------------------------------------------
  describe('create()', () => {
    const email = 'new@example.com';
    const hashedPassword = '$2a$10$somehash';
    const verificationToken = 'sha256-hashed-token';

    it('creates and saves a user with the correct fields', async () => {
      const built = makeUser({ email, password: hashedPassword, verificationToken });
      const saved = { ...built, id: 'new-uuid' };
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(saved);

      const result = await service.create(email, hashedPassword, verificationToken);

      expect(repo.create).toHaveBeenCalledWith({
        email,
        password: hashedPassword,
        verificationToken,
        isVerified: false,
      });
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(saved);
    });

    it('always sets isVerified to false on creation', async () => {
      repo.create.mockReturnValue(makeUser());
      repo.save.mockResolvedValue(makeUser());

      await service.create(email, hashedPassword, verificationToken);

      const createArg = repo.create.mock.calls[0][0];
      expect(createArg.isVerified).toBe(false);
    });

    it('returns the persisted user from the repository', async () => {
      const saved = makeUser({ id: 'returned-uuid' });
      repo.create.mockReturnValue(makeUser());
      repo.save.mockResolvedValue(saved);

      const result = await service.create(email, hashedPassword, verificationToken);

      expect(result).toBe(saved);
    });
  });

  // ---------------------------------------------------------------------------
  // findByVerificationToken()
  // ---------------------------------------------------------------------------
  describe('findByVerificationToken()', () => {
    it('returns the user matching the hashed token', async () => {
      const user = makeUser({ verificationToken: 'hashed-token' });
      repo.findOne.mockResolvedValue(user);

      const result = await service.findByVerificationToken('hashed-token');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { verificationToken: 'hashed-token' } });
      expect(result).toBe(user);
    });

    it('returns null when no user matches the token', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findByVerificationToken('unknown-token');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // verifyUser()
  // ---------------------------------------------------------------------------
  describe('verifyUser()', () => {
    it('sets isVerified to true and clears the verificationToken', async () => {
      repo.update.mockResolvedValue(undefined);

      await service.verifyUser('user-uuid-1');

      expect(repo.update).toHaveBeenCalledWith('user-uuid-1', {
        isVerified: true,
        verificationToken: null,
      });
    });

    it('returns void', async () => {
      repo.update.mockResolvedValue(undefined);

      const result = await service.verifyUser('user-uuid-1');

      expect(result).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // setVerificationToken()
  // ---------------------------------------------------------------------------
  describe('setVerificationToken()', () => {
    it('updates only the verificationToken field', async () => {
      repo.update.mockResolvedValue(undefined);

      await service.setVerificationToken('user-uuid-1', 'new-hashed-token');

      expect(repo.update).toHaveBeenCalledWith('user-uuid-1', {
        verificationToken: 'new-hashed-token',
      });
    });

    it('returns void', async () => {
      repo.update.mockResolvedValue(undefined);

      const result = await service.setVerificationToken('user-uuid-1', 'token');

      expect(result).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // findByResetToken()
  // ---------------------------------------------------------------------------
  describe('findByResetToken()', () => {
    it('returns the user matching the hashed reset token', async () => {
      const user = makeUser({ resetToken: 'hashed-reset-token' });
      repo.findOne.mockResolvedValue(user);

      const result = await service.findByResetToken('hashed-reset-token');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { resetToken: 'hashed-reset-token' } });
      expect(result).toBe(user);
    });

    it('returns null when no user matches the reset token', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findByResetToken('unknown-token');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // setResetToken()
  // ---------------------------------------------------------------------------
  describe('setResetToken()', () => {
    it('updates resetToken and resetTokenExpiry together', async () => {
      repo.update.mockResolvedValue(undefined);
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      await service.setResetToken('user-uuid-1', 'hashed-reset-token', expiry);

      expect(repo.update).toHaveBeenCalledWith('user-uuid-1', {
        resetToken: 'hashed-reset-token',
        resetTokenExpiry: expiry,
      });
    });

    it('returns void', async () => {
      repo.update.mockResolvedValue(undefined);

      const result = await service.setResetToken('user-uuid-1', 'token', new Date());

      expect(result).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // updatePassword()
  // ---------------------------------------------------------------------------
  describe('updatePassword()', () => {
    it('updates the password and nulls out both reset token fields', async () => {
      repo.update.mockResolvedValue(undefined);

      await service.updatePassword('user-uuid-1', 'new-hashed-password');

      expect(repo.update).toHaveBeenCalledWith('user-uuid-1', {
        password: 'new-hashed-password',
        resetToken: null,
        resetTokenExpiry: null,
      });
    });

    it('clears resetToken on password update', async () => {
      repo.update.mockResolvedValue(undefined);

      await service.updatePassword('user-uuid-1', 'new-hash');

      const updateArg = repo.update.mock.calls[0][1];
      expect(updateArg.resetToken).toBeNull();
    });

    it('clears resetTokenExpiry on password update', async () => {
      repo.update.mockResolvedValue(undefined);

      await service.updatePassword('user-uuid-1', 'new-hash');

      const updateArg = repo.update.mock.calls[0][1];
      expect(updateArg.resetTokenExpiry).toBeNull();
    });

    it('returns void', async () => {
      repo.update.mockResolvedValue(undefined);

      const result = await service.updatePassword('user-uuid-1', 'new-hash');

      expect(result).toBeUndefined();
    });
  });
});
