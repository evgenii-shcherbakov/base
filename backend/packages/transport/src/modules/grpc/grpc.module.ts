import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientGrpc, ClientsModule, ClientsProviderAsyncOptions } from '@nestjs/microservices';
import { TransportConfig, transportConfig } from 'config';
// import { GrpcClientEnum, GrpcServiceEnum } from 'modules/grpc/grpc.enums';
// import { GrpcStrategy } from 'modules/grpc/strategies/grpc.strategy';

// export type GrpcClientOptions = {
//   name: string | symbol;
//   service: GrpcServiceEnum;
// };
//
// export type GrpcModuleOptions = {
//   clients: GrpcClientOptions[];
// };

export type GrpcClientOptions = {
  name: string | symbol;
  service: string;
  package: keyof TransportConfig['grpc'];
};

export type GrpcModuleOptions = {
  clients: GrpcClientOptions[];
};

@Module({
  imports: [ConfigModule.forFeature(transportConfig)],
})
export class GrpcModule {
  static register(options: GrpcModuleOptions): DynamicModule {
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
          imports: [ConfigModule],
          inject: [ConfigService],
          name: clientSymbol,
          useFactory: (configService: ConfigService<TransportConfig>) => {
            return configService.getOrThrow(`grpc.${options.package}`, { infer: true });
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

  // static register(options: GrpcModuleOptions): DynamicModule {
  //   const serviceTokens: (string | symbol)[] = [];
  //   const services: Provider[] = [];
  //   const clients: ClientsProviderAsyncOptions[] = [];
  //   const clientAccumulator: Map<GrpcClientEnum, symbol> = new Map();
  //
  //   options.clients.forEach(({ service, name }) => {
  //     const client = GrpcStrategy.getClient(service);
  //     let clientSymbol: symbol;
  //
  //     if (clientAccumulator.has(client)) {
  //       clientSymbol = clientAccumulator.get(client);
  //     } else {
  //       clientSymbol = Symbol(`${client.toUpperCase()}_GRPC_CLIENT`);
  //       clientAccumulator.set(client, clientSymbol);
  //
  //       clients.push({
  //         name: clientSymbol,
  //         useFactory: () => GrpcStrategy.getClientOptions(client),
  //       });
  //     }
  //
  //     services.push({
  //       provide: name,
  //       useFactory: (client: ClientGrpc) => client.getService(GrpcStrategy.getServiceName(service)),
  //       inject: [clientSymbol],
  //     });
  //
  //     serviceTokens.push(name);
  //   });
  //
  //   return {
  //     imports: [
  //       ClientsModule.registerAsync({
  //         clients: [...clients],
  //       }),
  //     ],
  //     providers: [...services],
  //     exports: [...serviceTokens],
  //     module: GrpcModule,
  //   };
  // }
}
