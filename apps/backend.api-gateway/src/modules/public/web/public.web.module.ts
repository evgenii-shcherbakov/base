import { Module } from '@nestjs/common';
import { GrpcModule, GrpcServiceEnum } from '@packages/backend.transport';
import { PUBLIC_CONTACT_SERVICE_CLIENT } from 'modules/public/public.constants';
import { PublicWebController } from 'modules/public/web/public.web.controller';

@Module({
  imports: [
    GrpcModule.register({
      clients: [
        {
          name: PUBLIC_CONTACT_SERVICE_CLIENT,
          service: GrpcServiceEnum.PUBLIC_CONTACT,
        },
      ],
    }),
  ],
  controllers: [PublicWebController],
})
export class PublicWebModule {}
