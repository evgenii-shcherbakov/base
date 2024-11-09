import { GrpcModule } from '@backend/transport';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { config } from 'config';
import { MainModule } from 'modules/main/main.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    GrpcModule.forRoot(),
    MainModule,
  ],
})
export class ApiGatewayModule {}
