import { resolveErrorMessage } from '@backend/common';
import { GRPC_MICROSERVICE_OPTIONS } from '@backend/grpc';
import { REDIS_MICROSERVICE_OPTIONS } from '@backend/event-bus-redis';
import { Logger } from '@nestjs/common';
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

// See `backend/apps/auth/src/main.ts`: an empty catch turns a failed bootstrap into a silent
// exit with code 0.
bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(
    resolveErrorMessage(error, 'Failed to start the application'),
    error instanceof Error ? error.stack : undefined,
  );

  process.exit(1);
});
