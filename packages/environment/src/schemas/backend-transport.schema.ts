import Joi from 'joi';

export const BackendMainTransportSchema = {
  MAIN_GRPC_URL: Joi.string().optional(),
};

export const BackendCvTransportSchema = {
  CV_GRPC_URL: Joi.string().optional(),
};

export const BackendTransportSchema = {
  ...BackendMainTransportSchema,
  // ...BackendCvTransportSchema,
};
