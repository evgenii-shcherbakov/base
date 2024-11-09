import { Module } from '@nestjs/common';
import { ContactRepositoryModule } from 'modules/contact/repository/contact.repository.module';
import { ContactRpcController } from 'modules/contact/rpc/contact.rpc.controller';
import { ContactWebController } from 'modules/contact/web/contact.web.controller';

@Module({
  imports: [ContactRepositoryModule],
  controllers: [ContactWebController],
})
export class ContactWebModule {}
