import { EnvValidator } from 'entities';
import {
  AdminSchema,
  BackendApiGatewaySchema,
  BackendCvSchema,
  BackendIdentitySchema,
  BackendMicroserviceSchema,
  DeploySchema,
  FrontendSchema,
} from 'schemas';
import { EnvironmentOf } from 'types';

export type { EnvValidator };

export const AdminEnvValidator = new EnvValidator(AdminSchema);
export const DeployEnvValidator = new EnvValidator(DeploySchema);
export const FrontendEnvValidator = new EnvValidator(FrontendSchema);

export type AdminEnvironment = EnvironmentOf<typeof AdminSchema>;
export type DeployEnvironment = EnvironmentOf<typeof DeploySchema>;
export type FrontendEnvironment = EnvironmentOf<typeof FrontendSchema>;

export const BackendApiGatewayEnvValidator = new EnvValidator(BackendApiGatewaySchema);
export const BackendIdentityEnvValidator = new EnvValidator(BackendIdentitySchema);
export const BackendCvEnvValidator = new EnvValidator(BackendCvSchema);

export type BackendMicroserviceEnvironment = EnvironmentOf<typeof BackendMicroserviceSchema>;
export type BackendApiGatewayEnvironment = EnvironmentOf<typeof BackendApiGatewaySchema>;
export type BackendIdentityEnvironment = EnvironmentOf<typeof BackendIdentitySchema>;
export type BackendCvEnvironment = EnvironmentOf<typeof BackendCvSchema>;

export type BackendEnvironment = BackendApiGatewayEnvironment & BackendIdentityEnvironment;
