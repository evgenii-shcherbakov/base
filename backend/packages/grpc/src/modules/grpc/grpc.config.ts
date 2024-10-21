import { Transport } from '@nestjs/microservices';
import { GrpcOptions } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { MAIN_PACKAGE_NAME, PROTO_PATH } from '@packages/grpc.nest';
import { config } from 'dotenv';
import { join } from 'node:path';

config();

const commonGrpcOptions = {
  loader: {
    objects: true,
    json: true,
    arrays: true,
    keepCase: true,
  },
};

export const grpcConfig = () =>
  ({
    main: <GrpcOptions>{
      transport: Transport.GRPC,
      options: {
        ...commonGrpcOptions,
        url: process.env.MAIN_GRPC_URL ?? '0.0.0.0:8000',
        package: MAIN_PACKAGE_NAME,
        protoPath: join(PROTO_PATH, 'main.proto'),
      },
    },
  }) as const;

export type GrpcConfig = ReturnType<typeof grpcConfig>;
