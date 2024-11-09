import { MongoModule } from '@backend/persistence';
import { GrpcModule } from '@backend/transport';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { config } from 'config';
import { ContactModule } from 'modules/contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    MongoModule.forRoot(),
    GrpcModule.forRoot(),
    ContactModule,
  ],
})
export class MainModule {}
