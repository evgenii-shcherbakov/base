import { AdminEnvironment } from '@packages/environment';

declare global {
  namespace NodeJS {
    interface ProcessEnv extends AdminEnvironment {}
  }
}

export {};
