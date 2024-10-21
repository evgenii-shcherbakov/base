import { BackendApiGatewayEnvironment } from '@packages/environment';

declare global {
  namespace NodeJS {
    interface ProcessEnv extends BackendApiGatewayEnvironment {}
  }
}

export {};
