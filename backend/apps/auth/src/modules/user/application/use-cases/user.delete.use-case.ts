import { CacheService } from '@backend/cache';
import { DeleteUseCase } from '@backend/common';
import { NestAuth } from '@backend/proto';
import { USER_CACHE } from '@modules/user/domain/constants/user.tokens';
import { UserRepository } from '@modules/user/domain/repositories/user.repository';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Either } from '@sweet-monads/either';

@Injectable()
export class UserDeleteUseCase extends DeleteUseCase<NestAuth.User, NestAuth.UserQuery> {
  constructor(
    protected readonly repository: UserRepository,
    @Inject(USER_CACHE)
    private readonly userCache: CacheService,
  ) {
    super(repository);
  }

  /**
   * `deleteMany` reports a boolean, not the rows it removed, so there are no ids to evict — the
   * whole `cache:auth:user:*` scope goes instead. A deleted user must never keep passing the
   * gateway's access guard.
   */
  async deleteMany(query: Partial<NestAuth.UserQuery>): Promise<boolean> {
    const deleted = await super.deleteMany(query);

    if (deleted) {
      await this.userCache.deleteByPrefix();
    }

    return deleted;
  }

  protected async afterSingleDeletion(
    result: Either<NotFoundException, NestAuth.User>,
  ): Promise<void> {
    if (result.isRight()) {
      await this.userCache.delete(result.value.id);
    }
  }
}
