import { CacheService } from '@backend/cache';
import { NestAuth } from '@backend/proto';
import { CryptoService } from '@modules/crypto/domain/services/crypto.service';
import { USER_CACHE } from '@modules/user/domain/constants/user.tokens';
import { UserRepository, UserUpdate } from '@modules/user/domain/repositories/user.repository';
import { Inject, Injectable } from '@nestjs/common';
import { Either } from '@sweet-monads/either';
import _ from 'lodash';

@Injectable()
export class UserUpdateOneUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cryptoService: CryptoService,
    @Inject(USER_CACHE)
    private readonly userCache: CacheService,
  ) {}

  async execute(
    query: Partial<NestAuth.UserQuery>,
    updateData: NestAuth.UserUpdate,
  ): Promise<Either<Error, NestAuth.User>> {
    const update: UserUpdate = {
      ...updateData,
      set: _.omit(updateData.set ?? {}, 'password'),
    };

    if (updateData.set?.password) {
      const hashedPassword = await this.cryptoService.hash(updateData.set.password);

      if (hashedPassword.isRight()) {
        update.set.hash = hashedPassword.value;
      }
    }

    const user = await this.userRepository.updateOne(query, update);

    if (user.isRight()) {
      // Keyed off the updated entity, not the query: a user may be addressed by email here,
      // while the cache is keyed by id.
      await this.userCache.delete(user.value.id);
    }

    return user;
  }
}
