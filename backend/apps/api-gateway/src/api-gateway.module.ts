import { CommonModule } from '@backend/common';
import { GrpcModule } from '@backend/grpc';
import { Module } from '@nestjs/common';
import { BackendApiGatewayEnvValidator } from '@packages/environment';
import { MainModule } from 'modules/main/main.module';

@Module({
  imports: [
    CommonModule.register({
      envValidator: BackendApiGatewayEnvValidator,
    }),
    GrpcModule.forRoot(),
    MainModule,
  ],
})
export class ApiGatewayModule {}
