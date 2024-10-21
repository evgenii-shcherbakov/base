import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MainDatabaseCollection } from '@packages/common';
import { Persistence } from 'decorators';
import { EXPERIENCE_REPOSITORY } from 'modules/persistence/experience/experience.repository';
import { ExperienceRepositoryImpl } from 'modules/persistence/experience/impl/experience.repository.impl';
import { ExperienceEntity, ExperienceSchema } from 'schemas';

@Persistence(MainDatabaseCollection.EXPERIENCE)
@Module({
  imports: [MongooseModule.forFeature([{ name: ExperienceEntity.name, schema: ExperienceSchema }])],
  providers: [
    {
      provide: EXPERIENCE_REPOSITORY,
      useClass: ExperienceRepositoryImpl,
    },
  ],
  exports: [EXPERIENCE_REPOSITORY],
})
export class ExperiencePersistenceModule {}
