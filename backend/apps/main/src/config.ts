import { commonConfig } from '@backend/common';
// import dotenv from 'dotenv';
//
// dotenv.config();

export const config = () =>
  ({
    ...commonConfig(),
  }) as const;

export type Config = ReturnType<typeof config>;
