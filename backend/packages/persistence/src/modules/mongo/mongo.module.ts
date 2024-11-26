import { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, MongoConfig } from 'modules/mongo/mongo.config';
import { MONGO_CONFIG_SERVICE } from 'modules/mongo/mongo.constants';

export class MongoModule {
  static forRoot(): DynamicModule {
    return {
      imports: [
        ConfigModule.forFeature(mongoConfig),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService<MongoConfig>) => {
            return configService.getOrThrow('mongo', { infer: true });
          },
        }),
      ],
      providers: [
        {
          provide: MONGO_CONFIG_SERVICE,
          useClass: ConfigService,
        },
      ],
      exports: [MongooseModule, MONGO_CONFIG_SERVICE],
      global: true,
      module: MongoModule,
    };
  }
}
