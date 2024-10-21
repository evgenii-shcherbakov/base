import { InjectModel } from '@nestjs/mongoose';
import { Experience } from 'interfaces';
import { MongoMapper } from 'mappers';
import { ExperienceRepository } from 'modules/persistence/experience/experience.repository';
import { Model } from 'mongoose';
import { MongoRepositoryImpl } from 'repositories';
import { ExperienceEntity } from 'schemas';

export class ExperienceRepositoryImpl
  extends MongoRepositoryImpl<ExperienceEntity, Experience>
  implements ExperienceRepository
{
  constructor(@InjectModel(ExperienceEntity.name) protected readonly model: Model<ExperienceEntity>) {
    super(model, new MongoMapper());
  }
}
