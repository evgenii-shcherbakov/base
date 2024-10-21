import { BackendMainEnvironment } from '@packages/environment';

declare global {
  namespace NodeJS {
    interface ProcessEnv extends BackendMainEnvironment {}
  }
}

export {};
