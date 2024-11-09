import { Module } from '@nestjs/common';
import { ContactRpcModule } from 'modules/contact/rpc/contact.rpc.module';
import { ContactWebModule } from 'modules/contact/web/contact.web.module';

@Module({
  imports: [ContactRpcModule, ContactWebModule],
})
export class ContactModule {}
