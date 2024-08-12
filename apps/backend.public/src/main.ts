import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ApiExceptionFilter } from '@packages/backend.common';
import { GrpcClientEnum, GrpcStrategy } from '@packages/backend.transport';
import { PublicModule } from 'public.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PublicModule,
    GrpcStrategy.getClientOptions(GrpcClientEnum.PUBLIC),
  );

  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen();
}
bootstrap();
