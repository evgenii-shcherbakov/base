import { Module } from '@nestjs/common';
import { PersistenceModule } from '@packages/backend.common';
import { DatabaseCollection } from '@packages/common';
import { PUBLIC_SERVICE } from 'modules/contact/service/contact.service';
import { ContactServiceImpl } from 'modules/contact/service/impl/contact.service.impl';

@Module({
  imports: [PersistenceModule.forFeature(DatabaseCollection.CONTACT)],
  providers: [
    {
      provide: PUBLIC_SERVICE,
      useClass: ContactServiceImpl,
    },
  ],
  exports: [PUBLIC_SERVICE],
})
export class ContactServiceModule {}
