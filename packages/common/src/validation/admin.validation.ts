import Joi from 'joi';
import { MongoValidationSchema, NodeValidationSchema } from 'validation/common.validation';
import { EnvironmentOf } from 'validation/types';

export const AdminValidationSchema = {
  ...NodeValidationSchema,
  ...MongoValidationSchema,
  PAYLOAD_SECRET: Joi.string().required(),
} as const;

export type AdminEnvironment = EnvironmentOf<typeof AdminValidationSchema>;
