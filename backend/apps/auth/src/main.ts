import { GRPC_MICROSERVICE_OPTIONS } from '@backend/grpc';
import { REDIS_MICROSERVICE_OPTIONS } from '@backend/event-bus-redis';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.connectMicroservice(app.get(GRPC_MICROSERVICE_OPTIONS), { inheritAppConfig: true });
  app.connectMicroservice(app.get(REDIS_MICROSERVICE_OPTIONS), { inheritAppConfig: true });

  await app.startAllMicroservices();
  await app.init();
}

bootstrap()
  .then()
  .catch(() => {});
