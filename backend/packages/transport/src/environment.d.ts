import { BackendEnvironment } from '@packages/environment';

declare global {
  namespace NodeJS {
    interface ProcessEnv extends BackendEnvironment {}
  }
}

export {};
