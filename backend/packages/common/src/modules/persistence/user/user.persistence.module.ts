import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MainDatabaseCollection } from '@packages/common';
import { Persistence } from 'decorators';
import { USER_REPOSITORY } from 'modules/persistence/user/user.repository';
import { UserRepositoryImpl } from 'modules/persistence/user/impl/user.repository.impl';
import { UserEntity, UserSchema } from 'schemas';

@Persistence(MainDatabaseCollection.USER)
@Module({
  imports: [MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }])],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UserPersistenceModule {}
