import { DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientGrpc, ClientsModule, ClientsProviderAsyncOptions } from '@nestjs/microservices';
import _ from 'lodash';
import { GrpcConfig, grpcConfig, GrpcPackage } from 'modules/grpc/grpc.config';
import { GRPC_CONFIG_SERVICE, MICROSERVICE_GRPC_OPTIONS } from 'modules/grpc/grpc.constants';
import { getGrpcClientToken, getGrpcServiceToken } from 'modules/grpc/helpers';

export type GrpcModuleForRootOptions = {
  package?: GrpcPackage;
};

export type GrpcModuleForFeatureOptions = {
  strategy: {
    [Client in GrpcPackage]?: GrpcConfig[Client]['services'][number][];
  };
};

export class GrpcModule {
  static forRoot(options: GrpcModuleForRootOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: GRPC_CONFIG_SERVICE,
        useClass: ConfigService,
      },
    ];

    const exports: DynamicModule['exports'] = [GRPC_CONFIG_SERVICE];

    if (options.package) {
      providers.push({
        provide: MICROSERVICE_GRPC_OPTIONS,
        inject: [GRPC_CONFIG_SERVICE],
        useFactory: (configService: ConfigService<GrpcConfig>) => {
          return configService.getOrThrow(options.package, { infer: true });
        },
      });

      exports.push(MICROSERVICE_GRPC_OPTIONS);
    }

    return {
      imports: [ConfigModule.forFeature(grpcConfig)],
      providers,
      exports,
      module: GrpcModule,
      global: true,
    };
  }

  static forFeature(options: GrpcModuleForFeatureOptions): DynamicModule {
    const clients: ClientsProviderAsyncOptions[] = [];
    const providers: Provider[] = [];
    const exports: DynamicModule['exports'] = [ClientsModule];

    for (const [clientName, services] of _.entries(options.strategy)) {
      const clientToken = getGrpcClientToken(clientName);

      clients.push({
        inject: [GRPC_CONFIG_SERVICE],
        name: clientToken,
        useFactory: (configService: ConfigService) => configService.getOrThrow(clientName),
      });

      _.forEach(services, (service) => {
        const serviceToken = getGrpcServiceToken(service);

        providers.push({
          provide: serviceToken,
          inject: [clientToken],
          useFactory: (client: ClientGrpc) => client.getService(service),
        });

        exports.push(serviceToken);
      });
    }

    return {
      imports: [ClientsModule.registerAsync({ clients })],
      providers,
      exports,
      module: GrpcModule,
    };
  }
}
