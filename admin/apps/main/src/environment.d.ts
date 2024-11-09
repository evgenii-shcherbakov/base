import { AdminEnvironment } from '@packages/common';

declare global {
  namespace NodeJS {
    interface ProcessEnv extends AdminEnvironment {}
  }
}

export {};
