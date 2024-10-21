import { GrpcModule } from '@backend/grpc';
import { Module } from '@nestjs/common';
import { CONTACT_SERVICE_NAME, MAIN_PACKAGE_NAME } from '@packages/grpc.nest';
import { MAIN_CONTACT_SERVICE_CLIENT } from 'modules/main/main.constants';
import { MainWebController } from 'modules/main/web/main.web.controller';

@Module({
  imports: [
    GrpcModule.forFeature({
      clients: [
        {
          name: MAIN_CONTACT_SERVICE_CLIENT,
          service: CONTACT_SERVICE_NAME,
          package: MAIN_PACKAGE_NAME,
        },
      ],
    }),
  ],
  controllers: [MainWebController],
})
export class MainWebModule {}
