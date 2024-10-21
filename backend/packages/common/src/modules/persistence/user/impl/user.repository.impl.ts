import { InjectModel } from '@nestjs/mongoose';
import { User } from 'interfaces';
import { MongoMapper } from 'mappers';
import { UserRepository } from 'modules/persistence/user/user.repository';
import { Model } from 'mongoose';
import { MongoRepositoryImpl } from 'repositories';
import { UserEntity } from 'schemas';

export class UserRepositoryImpl
  extends MongoRepositoryImpl<UserEntity, User>
  implements UserRepository
{
  constructor(@InjectModel(UserEntity.name) protected readonly model: Model<UserEntity>) {
    super(model, new MongoMapper());
  }
}
