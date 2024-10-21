import { EnvValidator } from 'entities';
import {
  AdminSchema,
  BackendApiGatewaySchema,
  BackendCvSchema,
  BackendMainSchema,
  BackendMicroserviceSchema,
  FrontendSchema,
} from 'schemas';
import { EnvironmentOf } from 'types';

export type { EnvValidator };

export const AdminEnvValidator = new EnvValidator(AdminSchema);
export const FrontendEnvValidator = new EnvValidator(FrontendSchema);

export type AdminEnvironment = EnvironmentOf<typeof AdminSchema>;
export type FrontendEnvironment = EnvironmentOf<typeof FrontendSchema>;

export const BackendApiGatewayEnvValidator = new EnvValidator(BackendApiGatewaySchema);
export const BackendMainEnvValidator = new EnvValidator(BackendMainSchema);
export const BackendCvEnvValidator = new EnvValidator(BackendCvSchema);

export type BackendMicroserviceEnvironment = EnvironmentOf<typeof BackendMicroserviceSchema>;
export type BackendApiGatewayEnvironment = EnvironmentOf<typeof BackendApiGatewaySchema>;
export type BackendMainEnvironment = EnvironmentOf<typeof BackendMainSchema>;
export type BackendCvEnvironment = EnvironmentOf<typeof BackendCvSchema>;

export type BackendEnvironment = BackendApiGatewayEnvironment & BackendMainEnvironment;
