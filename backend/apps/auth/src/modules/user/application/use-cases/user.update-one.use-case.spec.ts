import { CacheService, MemoryCacheStore } from '@backend/cache';
import { NestAuth } from '@backend/proto';
import { CryptoService } from '@modules/crypto/domain/services/crypto.service';
import { UserRepository } from '@modules/user/domain/repositories/user.repository';
import { NotFoundException } from '@nestjs/common';
import { left, right } from '@sweet-monads/either';
import { UserUpdateOneUseCase } from './user.update-one.use-case';

const USER_ID = '01JQ0000000000000000000000';

const user: NestAuth.User = {
  id: USER_ID,
  email: 'user@example.com',
  role: NestAuth.UserRole.USER,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('UserUpdateOneUseCase', () => {
  let cache: CacheService;
  let updateOne: jest.Mock;
  let hash: jest.Mock;
  let useCase: UserUpdateOneUseCase;

  beforeEach(() => {
    cache = new CacheService(new MemoryCacheStore(), {
      keyPrefix: 'cache',
      namespace: 'auth:user',
    });
    updateOne = jest.fn().mockResolvedValue(right(user));
    hash = jest.fn().mockResolvedValue(right('hashed'));

    useCase = new UserUpdateOneUseCase(
      { updateOne } as unknown as UserRepository,
      { hash } as unknown as CryptoService,
      cache,
    );
  });

  it('evicts the updated user, keyed by the entity rather than the query', async () => {
    await cache.set(USER_ID, user);

    const result = await useCase.execute(
      { email: user.email },
      { set: { role: NestAuth.UserRole.ADMIN } },
    );

    expect(result.isRight()).toBe(true);
    await expect(cache.has(USER_ID)).resolves.toBe(false);
  });

  it('keeps the cached user when the update fails', async () => {
    updateOne.mockResolvedValue(left(new NotFoundException()));
    await cache.set(USER_ID, user);

    const result = await useCase.execute({ id: USER_ID }, { set: { email: 'new@example.com' } });

    expect(result.isLeft()).toBe(true);
    await expect(cache.has(USER_ID)).resolves.toBe(true);
  });

  it('never writes the raw password to the repository', async () => {
    await useCase.execute({ id: USER_ID }, { set: { password: 'secret' } });

    expect(hash).toHaveBeenCalledWith('secret');
    expect(updateOne).toHaveBeenCalledWith({ id: USER_ID }, { set: { hash: 'hashed' } });
  });
});
