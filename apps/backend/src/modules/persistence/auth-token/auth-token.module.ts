import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AuthTokenSchema,
  AuthTokenSymbol,
} from '@backend/modules/persistence/auth-token/schemas/auth-token.schema';
import { AuthTokenRepositorySymbol } from '@backend/domains/auth/repositories/auth-token.repository';
import { AuthTokenRepositoryImpl } from '@backend/modules/persistence/auth-token/repositories/auth-token.repository.impl';

@Module({
  imports: [MongooseModule.forFeature([{ name: AuthTokenSymbol, schema: AuthTokenSchema }])],
  providers: [
    {
      provide: AuthTokenRepositorySymbol,
      useClass: AuthTokenRepositoryImpl,
    },
  ],
  exports: [AuthTokenRepositorySymbol],
})
export class AuthTokenModule {}
