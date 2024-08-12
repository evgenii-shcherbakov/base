import { Module } from '@nestjs/common';
import { CommonModule, PersistenceModule } from '@packages/backend.common';
import { BackendPublicEnvValidator } from '@packages/environment';
import { ContactModule } from 'modules/contact/contact.module';

@Module({
  imports: [
    CommonModule.register({
      envValidator: BackendPublicEnvValidator,
    }),
    PersistenceModule.forRoot(),
    ContactModule,
  ],
})
export class PublicModule {}
