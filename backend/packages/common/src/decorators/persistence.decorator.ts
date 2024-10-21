import { SetMetadata } from '@nestjs/common';
import { MainDatabaseCollection } from '@packages/common';
import { MetadataKey } from 'enums';

export const Persistence = (collection: MainDatabaseCollection): ClassDecorator => {
  return SetMetadata(MetadataKey.PERSISTENCE_MODULE_COLLECTION, collection);
};
