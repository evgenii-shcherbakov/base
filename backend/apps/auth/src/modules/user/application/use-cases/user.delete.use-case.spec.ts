import { CacheService, MemoryCacheStore } from '@backend/cache';
import { NestAuth } from '@backend/proto';
import { UserRepository } from '@modules/user/domain/repositories/user.repository';
import { NotFoundException } from '@nestjs/common';
import { left, right } from '@sweet-monads/either';
import { UserDeleteUseCase } from './user.delete.use-case';

const USER_ID = '01JQ0000000000000000000000';
const OTHER_USER_ID = '01JQ1111111111111111111111';

const user: NestAuth.User = {
  id: USER_ID,
  email: 'user@example.com',
  role: NestAuth.UserRole.USER,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('UserDeleteUseCase', () => {
  let cache: CacheService;
  let repository: { deleteById: jest.Mock; deleteOne: jest.Mock; deleteMany: jest.Mock };
  let useCase: UserDeleteUseCase;

  beforeEach(() => {
    cache = new CacheService(new MemoryCacheStore(), {
      keyPrefix: 'cache',
      namespace: 'auth:user',
    });
    repository = {
      deleteById: jest.fn().mockResolvedValue(right(user)),
      deleteOne: jest.fn().mockResolvedValue(right(user)),
      deleteMany: jest.fn().mockResolvedValue(true),
    };

    useCase = new UserDeleteUseCase(repository as unknown as UserRepository, cache);
  });

  it('evicts the deleted user', async () => {
    await cache.set(USER_ID, user);

    await useCase.deleteById(USER_ID);

    await expect(cache.has(USER_ID)).resolves.toBe(false);
  });

  it('evicts nothing when the user was not there', async () => {
    repository.deleteOne.mockResolvedValue(left(new NotFoundException()));
    await cache.set(USER_ID, user);

    await useCase.deleteOne({ email: 'missing@example.com' });

    await expect(cache.has(USER_ID)).resolves.toBe(true);
  });

  it('clears the whole scope on a bulk delete, which reports no ids', async () => {
    const deleteByPrefix = jest.spyOn(cache, 'deleteByPrefix');
    await cache.set(USER_ID, user);
    await cache.set(OTHER_USER_ID, user);

    await expect(useCase.deleteMany({ roles: [NestAuth.UserRole.USER] })).resolves.toBe(true);

    expect(deleteByPrefix).toHaveBeenCalledWith();
    await expect(cache.has(USER_ID)).resolves.toBe(false);
    await expect(cache.has(OTHER_USER_ID)).resolves.toBe(false);
  });

  it('leaves the scope alone when the bulk delete removed nothing', async () => {
    repository.deleteMany.mockResolvedValue(false);
    await cache.set(USER_ID, user);

    await expect(useCase.deleteMany({ roles: [NestAuth.UserRole.ADMIN] })).resolves.toBe(false);

    await expect(cache.has(USER_ID)).resolves.toBe(true);
  });
});
