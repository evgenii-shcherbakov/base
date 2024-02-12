import type { EnvValidator } from '@shared/environment';

export type DeployProjectEntity = {
  id: string;
  name: string;
  path: string;
  watch: string[];
  appName: string;
  prepareCommand?: string;
  validator: EnvValidator;
};