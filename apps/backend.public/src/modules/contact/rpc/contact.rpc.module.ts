import { Module } from '@nestjs/common';
import { ContactRpcController } from 'modules/contact/rpc/contact.rpc.controller';
import { ContactServiceModule } from 'modules/contact/service/contact.service.module';

@Module({
  imports: [ContactServiceModule],
  controllers: [ContactRpcController],
})
export class ContactRpcModule {}
