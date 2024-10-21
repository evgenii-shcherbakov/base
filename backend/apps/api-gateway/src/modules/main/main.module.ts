import { Module } from '@nestjs/common';
import { MainWebModule } from 'modules/main/web/main.web.module';

@Module({
  imports: [MainWebModule],
})
export class MainModule {}
