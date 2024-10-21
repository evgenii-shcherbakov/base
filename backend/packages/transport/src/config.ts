import { Transport } from '@nestjs/microservices';
import { GrpcOptions } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { config } from 'dotenv';
import { MAIN_PACKAGE_NAME } from 'generated/main';
import { join } from 'node:path';

config();

export const PROTO_ROOT = join(__dirname, '../..', 'node_modules/@backend/transport/dist/proto');

const commonGrpcOptions = {
  loader: {
    objects: true,
    json: true,
    arrays: true,
    keepCase: true,
  },
};

export const transportConfig = () =>
  ({
    grpc: {
      main: <GrpcOptions>{
        transport: Transport.GRPC,
        options: {
          ...commonGrpcOptions,
          url: process.env.MAIN_GRPC_URL ?? '0.0.0.0:8000',
          package: MAIN_PACKAGE_NAME,
          protoPath: join(PROTO_ROOT, 'main.proto'),
        },
      },
    },
  }) as const;

export type TransportConfig = ReturnType<typeof transportConfig>;
