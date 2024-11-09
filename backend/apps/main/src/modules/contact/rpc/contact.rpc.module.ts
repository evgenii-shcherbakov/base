import { Module } from '@nestjs/common';
import { ContactRepositoryModule } from 'modules/contact/repository/contact.repository.module';
import { ContactRpcController } from 'modules/contact/rpc/contact.rpc.controller';

@Module({
  imports: [ContactRepositoryModule],
  controllers: [ContactRpcController],
})
export class ContactRpcModule {}
