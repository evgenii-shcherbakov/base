import { Module } from '@nestjs/common';
import { PublicWebModule } from 'modules/public/web/public.web.module';

@Module({
  imports: [PublicWebModule],
})
export class PublicModule {}
