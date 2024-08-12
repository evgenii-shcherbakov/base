import { Module } from '@nestjs/common';
import { CommonModule } from '@packages/backend.common';
import { BackendApiGatewayEnvValidator } from '@packages/environment';
import { PublicModule } from 'modules/public/public.module';

@Module({
  imports: [
    CommonModule.register({
      envValidator: BackendApiGatewayEnvValidator,
    }),
    PublicModule,
  ],
})
export class ApiGatewayModule {}
