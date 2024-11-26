import { GrpcModule } from '@backend/transport';
import { Module } from '@nestjs/common';
import { CONTACT_SERVICE_NAME, MAIN_PACKAGE_NAME } from '@packages/grpc.nest';
import { MainWebController } from 'modules/main/web/main.web.controller';

@Module({
  imports: [
    GrpcModule.forFeature({
      strategy: {
        [MAIN_PACKAGE_NAME]: [CONTACT_SERVICE_NAME],
      },
    }),
  ],
  controllers: [MainWebController],
})
export class MainWebModule {}
