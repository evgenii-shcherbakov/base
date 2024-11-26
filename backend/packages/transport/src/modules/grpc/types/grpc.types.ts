import { StatusObject } from '@grpc/grpc-js';

export type GrpcExceptionResponse = Omit<StatusObject, 'metadata'>;
