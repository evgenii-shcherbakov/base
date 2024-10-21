import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MainDatabaseCollection } from '@packages/common';
import { Persistence } from 'decorators';
import { migrations } from 'migrations';
import { MigrationRepositoryImpl } from 'modules/persistence/migration/impl/migration.repository.impl';
import { MIGRATIONS } from 'modules/persistence/migration/migration.constants';
import { MIGRATION_REPOSITORY } from 'modules/persistence/migration/migration.repository';
import { MigrationService } from 'modules/persistence/migration/migration.service';
import { MigrationEntity, MigrationSchema } from 'schemas';

@Persistence(MainDatabaseCollection.MIGRATION)
@Module({
  imports: [MongooseModule.forFeature([{ name: MigrationEntity.name, schema: MigrationSchema }])],
  providers: [
    {
      provide: MIGRATIONS,
      useValue: migrations,
    },
    {
      provide: MIGRATION_REPOSITORY,
      useClass: MigrationRepositoryImpl,
    },
    MigrationService,
  ],
  exports: [MIGRATION_REPOSITORY],
})
export class MigrationPersistenceModule {}
