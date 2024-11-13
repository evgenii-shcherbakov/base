import { Transport } from '@nestjs/microservices';
import { GrpcOptions } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { BackendGrpcValidationSchema, validateEnv } from '@packages/common';
import { MAIN_PACKAGE_NAME, PROTO_PATH } from '@packages/grpc.nest';
import { join } from 'path';

const env = validateEnv(BackendGrpcValidationSchema);

const commonGrpcOptions: Partial<GrpcOptions['options']> = {
  loader: {
    arrays: true,
    keepCase: true,
    enums: String,
  },
};

export const grpcConfig = () =>
  ({
    main: <GrpcOptions>{
      transport: Transport.GRPC,
      options: {
        ...commonGrpcOptions,
        url: env.MAIN_GRPC_URL ?? '0.0.0.0:8000',
        package: MAIN_PACKAGE_NAME,
        protoPath: join(PROTO_PATH, 'main.proto'),
      },
    },
  }) as const;

export type GrpcConfig = ReturnType<typeof grpcConfig>;
