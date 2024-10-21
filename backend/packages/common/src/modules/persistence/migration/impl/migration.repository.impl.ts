import { InjectModel } from '@nestjs/mongoose';
import { MigrationStatusEnum } from 'enums';
import { Migration } from 'interfaces';
import { MongoMapper } from 'mappers';
import { MigrationRepository } from 'modules/persistence/migration/migration.repository';
import { Model } from 'mongoose';
import { MongoRepositoryImpl } from 'repositories';
import { MigrationEntity } from 'schemas';

export class MigrationRepositoryImpl
  extends MongoRepositoryImpl<MigrationEntity, Migration>
  implements MigrationRepository
{
  constructor(@InjectModel(MigrationEntity.name) protected readonly model: Model<MigrationEntity>) {
    super(model, new MongoMapper());
  }

  async getSuccessMigrationNames(): Promise<string[]> {
    return this.model.distinct('name', { status: MigrationStatusEnum.SUCCESS }).lean();
  }
}
