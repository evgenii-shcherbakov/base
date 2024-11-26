import type { AnySchema } from 'joi';

type TypeOf<Definition> = Definition extends AnySchema<infer Type> ? Type : Definition;

export type EnvironmentOf<ValidationSchema extends Record<string, AnySchema>> = {
  [Variable in keyof ValidationSchema]: TypeOf<ValidationSchema[Variable]>;
};
