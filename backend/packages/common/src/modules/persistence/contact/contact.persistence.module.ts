import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MainDatabaseCollection } from '@packages/common';
import { Persistence } from 'decorators';
import { CONTACT_REPOSITORY } from 'modules/persistence/contact/contact.repository';
import { ContactRepositoryImpl } from 'modules/persistence/contact/impl/contact.repository.impl';
import { ContactEntity, ContactSchema } from 'schemas';

@Persistence(MainDatabaseCollection.CONTACT)
@Module({
  imports: [MongooseModule.forFeature([{ name: ContactEntity.name, schema: ContactSchema }])],
  providers: [
    {
      provide: CONTACT_REPOSITORY,
      useClass: ContactRepositoryImpl,
    },
  ],
  exports: [CONTACT_REPOSITORY],
})
export class ContactPersistenceModule {}
