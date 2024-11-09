import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'common/filters/http-exception.filter';
import { RpcExceptionFilter } from 'common/filters/rpc-exception.filter';
import { ApiGatewayModule } from 'api-gateway.module';
import { Config } from 'config';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule, { cors: true });
  const configService = app.get(ConfigService<Config>);
  const port = configService.get('port', { infer: true });
  const logger = new Logger();

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new RpcExceptionFilter(), new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Base')
    .setDescription('Base API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument: OpenAPIObject = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('/', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port, () => logger.log(`ApiGateway running on http://localhost:${port}`));
}
bootstrap();
