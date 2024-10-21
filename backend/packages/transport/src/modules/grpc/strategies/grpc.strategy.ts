// import { Injectable } from '@nestjs/common';
// import { Transport } from '@nestjs/microservices';
// import { GrpcOptions } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
// import { ONE } from '@packages/common';
// import { MAIN_PACKAGE_NAME, CONTACT_SERVICE_NAME } from 'generated/main';
// import { GrpcClientEnum, GrpcServiceEnum } from 'modules/grpc/grpc.enums';
// import { PROTO_ROOT } from 'modules/grpc/grpc.constants';
// import {
//   GrpcClientStrategy,
//   GrpcMappedClientParams,
//   GrpcMappedClientStrategy,
//   GrpcServiceStrategy,
// } from 'modules/grpc/strategies/grpc.strategy.types';
// import { join } from 'node:path';
//
// @Injectable()
// export class GrpcStrategy {
//   private static readonly serviceStrategy: GrpcServiceStrategy = {
//     [GrpcServiceEnum.MAIN_CONTACT]: {
//       packageName: MAIN_PACKAGE_NAME,
//       client: GrpcClientEnum.MAIN,
//       serviceName: CONTACT_SERVICE_NAME,
//     },
//     [GrpcServiceEnum.MAIN_EXPERIENCE]: {
//       packageName: MAIN_PACKAGE_NAME,
//       client: GrpcClientEnum.MAIN,
//       serviceName: CONTACT_SERVICE_NAME, // !
//     },
//   };
//
//   private static readonly clientStrategy: GrpcClientStrategy = {
//     [GrpcClientEnum.MAIN]: {
//       url: process.env.MAIN_GRPC_URL,
//       packageName: MAIN_PACKAGE_NAME,
//       protoPath: join(PROTO_ROOT, 'main.proto'),
//       services: [GrpcServiceEnum.MAIN_CONTACT, GrpcServiceEnum.MAIN_EXPERIENCE],
//     },
//   };
//
//   private static port: number = +process.env.FIRST_LOCAL_GRPC_PORT || 8000;
//
//   private static mapClientStrategy(): GrpcMappedClientStrategy {
//     return Object.keys(this.clientStrategy).reduce((acc: GrpcMappedClientStrategy, client) => {
//       const clientParams = this.clientStrategy[client as GrpcClientEnum];
//
//       if (clientParams.url) {
//         acc[client as GrpcClientEnum] = clientParams as GrpcMappedClientParams;
//         return acc;
//       }
//
//       const port = GrpcStrategy.port;
//       GrpcStrategy.port += ONE;
//
//       acc[client as GrpcClientEnum] = {
//         ...this.clientStrategy[client as GrpcClientEnum],
//         url: `0.0.0.0:${port}`,
//       };
//
//       return acc;
//     }, {} as GrpcMappedClientStrategy);
//   }
//
//   private static readonly mappedClientStrategy: GrpcMappedClientStrategy =
//     GrpcStrategy.mapClientStrategy();
//
//   static getServiceName(service: GrpcServiceEnum): string {
//     return this.serviceStrategy[service].serviceName;
//   }
//
//   static getClient(service: GrpcServiceEnum): GrpcClientEnum {
//     return this.serviceStrategy[service].client;
//   }
//
//   static getClientOptions(client: GrpcClientEnum): GrpcOptions {
//     const clientParams = this.mappedClientStrategy[client];
//
//     return {
//       transport: Transport.GRPC,
//       options: {
//         url: clientParams.url,
//         package: clientParams.packageName,
//         protoPath: clientParams.protoPath,
//         loader: {
//           objects: true,
//           json: true,
//           arrays: true,
//           keepCase: true,
//         },
//       },
//     };
//   }
// }
