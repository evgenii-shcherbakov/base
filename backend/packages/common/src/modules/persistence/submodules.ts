import { Type } from '@nestjs/common';
import { ContactPersistenceModule } from 'modules/persistence/contact';
import { MigrationPersistenceModule } from 'modules/persistence/migration';
import { UserPersistenceModule } from 'modules/persistence/user';
import { ExperiencePersistenceModule } from 'modules/persistence/experience';
// PERSISTENCE SUBMODULE IMPORTS

export const submodules: Type[] = [
  ContactPersistenceModule,
  MigrationPersistenceModule,
  UserPersistenceModule,
	ExperiencePersistenceModule,
	// PERSISTENCE SUBMODULE ARRAY
];
