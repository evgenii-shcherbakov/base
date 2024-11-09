import Joi from 'joi';
import { MongoValidationSchema, NodeValidationSchema } from 'validation/common.validation';
import { EnvironmentOf } from 'validation/types';

export const BackendGrpcValidationSchema = { MAIN_GRPC_URL: Joi.string().optional() } as const;

export const BackendApiGatewayValidationSchema = {
  ...NodeValidationSchema,
  ...BackendGrpcValidationSchema,
} as const;

export const BackendMainValidationSchema = {
  ...NodeValidationSchema,
  ...MongoValidationSchema,
  ...BackendGrpcValidationSchema,
} as const;

export type BackendGrpcEnvironment = EnvironmentOf<typeof BackendGrpcValidationSchema>;
export type BackendApiGatewayEnvironment = EnvironmentOf<typeof BackendApiGatewayValidationSchema>;
export type BackendMainEnvironment = EnvironmentOf<typeof BackendMainValidationSchema>;
