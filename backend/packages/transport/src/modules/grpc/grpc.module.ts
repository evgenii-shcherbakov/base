import { DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientGrpc, ClientsModule, ClientsProviderAsyncOptions } from '@nestjs/microservices';
import { GrpcConfig, grpcConfig } from 'modules/grpc/grpc.config';
import { GRPC_CONFIG_SERVICE } from 'modules/grpc/grpc.constants';

export type GrpcClientOptions = {
  name: string | symbol;
  service: string;
  package: keyof GrpcConfig;
};

export type GrpcModuleOptions = {
  clients: GrpcClientOptions[];
};

export class GrpcModule {
  static forRoot(): DynamicModule {
    return {
      imports: [ConfigModule.forFeature(grpcConfig)],
      providers: [
        {
          provide: GRPC_CONFIG_SERVICE,
          useClass: ConfigService,
        },
      ],
      exports: [GRPC_CONFIG_SERVICE],
      module: GrpcModule,
      global: true,
    };
  }

  static forFeature(options: GrpcModuleOptions): DynamicModule {
    const serviceTokens: (string | symbol)[] = [];
    const services: Provider[] = [];
    const clients: ClientsProviderAsyncOptions[] = [];
    const clientByPackage: Map<string, symbol> = new Map();

    options.clients.forEach((options) => {
      let clientSymbol: symbol;

      if (clientByPackage.has(options.package)) {
        clientSymbol = clientByPackage.get(options.package);
      } else {
        clientSymbol = Symbol(`${options.package.toUpperCase()}_GRPC_CLIENT`);
        clientByPackage.set(options.package, clientSymbol);

        clients.push({
          inject: [GRPC_CONFIG_SERVICE],
          name: clientSymbol,
          useFactory: (configService: ConfigService<GrpcConfig>) => {
            return configService.getOrThrow(options.package, { infer: true });
          },
        });
      }

      services.push({
        provide: options.name,
        useFactory: (client: ClientGrpc) => client.getService(options.service),
        inject: [clientSymbol],
      });

      serviceTokens.push(options.name);
    });

    return {
      imports: [ClientsModule.registerAsync({ clients })],
      providers: services,
      exports: serviceTokens,
      module: GrpcModule,
    };
  }
}
