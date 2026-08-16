import { GrpcModule } from '@backend/grpc';
import { GrpcAuthTransport } from '@backend/proto';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessService } from './domain/services/access.service';
import { TokenService } from './domain/services/token.service';
import { jwtConfig } from './infrastructure/configs/jwt.config';
import { JwtTokenServiceImpl } from './infrastructure/services/jwt.token.service.impl';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    JwtModule,
    GrpcModule.forFeature({
      strategy: {
        auth: [GrpcAuthTransport.service],
      },
    }),
  ],
  providers: [
    {
      provide: TokenService,
      useClass: JwtTokenServiceImpl,
    },
    AccessService,
  ],
  exports: [AccessService],
})
export class CommonModule {}
