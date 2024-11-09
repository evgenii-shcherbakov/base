import dotenv from 'dotenv';
import Joi, { type AnySchema } from 'joi';
import { EnvironmentOf } from 'validation/types';

export const validateEnv = <ValidationSchema extends Record<string, AnySchema>>(
  schema: ValidationSchema,
): EnvironmentOf<ValidationSchema> => {
  dotenv.config();

  const result = Joi.object(schema).validate(process.env, { allowUnknown: true });

  if (!result.error) {
    return result.value;
  }

  const errorsList = (result.error.details ?? []).reduce(
    (acc: string, { message }) => acc + ' ' + message,
    '',
  );

  throw Error(`Environment validation failed: ${errorsList}`);
};
