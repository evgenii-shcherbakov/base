import Joi from 'joi';

export const BackendPublicTransportSchema = {
  PUBLIC_GRPC_URL: Joi.string().optional(),
};

export const BackendCvTransportSchema = {
  CV_GRPC_URL: Joi.string().optional(),
};

export const BackendTransportSchema = {
  ...BackendPublicTransportSchema,
  // ...BackendCvTransportSchema,
};
