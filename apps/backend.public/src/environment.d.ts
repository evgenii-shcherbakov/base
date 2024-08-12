import { BackendPublicEnvironment } from '@packages/environment';

declare global {
  namespace NodeJS {
    interface ProcessEnv extends BackendPublicEnvironment {}
  }
}

export {};
