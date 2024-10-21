import { CommonModule, PersistenceModule } from '@backend/common';
import { GrpcModule } from '@backend/grpc';
import { Module } from '@nestjs/common';
import { BackendMainEnvValidator } from '@packages/environment';
import { ContactModule } from 'modules/contact/contact.module';

@Module({
  imports: [
    CommonModule.register({
      envValidator: BackendMainEnvValidator,
    }),
    GrpcModule.forRoot(),
    PersistenceModule.forRoot(),
    ContactModule,
  ],
})
export class MainModule {}
