import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactEntity, ContactSchema } from 'common/entities/contact.entity';
import { CONTACT_REPOSITORY } from 'modules/contact/repository/contact.repository';
import { ContactRepositoryImpl } from 'modules/contact/repository/impl/contact.repository.impl';

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
export class ContactRepositoryModule {}
