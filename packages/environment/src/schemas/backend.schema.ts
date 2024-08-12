import Joi from 'joi';
import {
  BackendCvTransportSchema,
  BackendPublicTransportSchema,
  BackendTransportSchema,
} from 'schemas/backend-transport.schema';
import { CommonSchema } from './common.schema';

export const BackendCommonSchema = {
  ...CommonSchema,
  FIRST_LOCAL_GRPC_PORT: Joi.alternatives<string | number>(Joi.string(), Joi.number()).optional(),
};

export const BackendMicroserviceSchema = {
  ...BackendCommonSchema,
  DATABASE_URL: Joi.string().required(),
};

export const BackendApiGatewaySchema = {
  ...BackendCommonSchema,
  ...BackendTransportSchema,
};

export const BackendPublicSchema = {
  ...BackendMicroserviceSchema,
  ...BackendPublicTransportSchema,
};

export const BackendCvSchema = {
  ...BackendMicroserviceSchema,
  ...BackendCvTransportSchema,
};
