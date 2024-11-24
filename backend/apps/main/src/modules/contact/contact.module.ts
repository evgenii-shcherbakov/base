import { Module } from '@nestjs/common';
import { ContactRpcModule } from 'modules/contact/rpc/contact.rpc.module';

@Module({
  imports: [ContactRpcModule],
})
export class ContactModule {}
