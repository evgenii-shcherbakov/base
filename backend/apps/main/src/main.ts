import { ApiExceptionFilter } from '@backend/common';
import { GRPC_CONFIG_SERVICE, GrpcConfig } from '@backend/transport';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Config } from 'config';
import { MainModule } from 'main.module';

async function bootstrap() {
  const app = await NestFactory.create(MainModule);
  const configService = app.get(ConfigService<Config>);
  const grpcConfigService: ConfigService<GrpcConfig> = app.get(GRPC_CONFIG_SERVICE);

  app.connectMicroservice(grpcConfigService.getOrThrow('main', { infer: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.startAllMicroservices(); // start() warn
  await app.listen(configService.get('port', { infer: true }));
}
bootstrap();
