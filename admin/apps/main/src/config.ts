import { AdminValidationSchema, validateEnv } from '@packages/common';

const env = validateEnv(AdminValidationSchema);

export const config = {
  port: env.PORT || 3336,
  dbUrl:
    env.MONGODB_URL ??
    'mongodb://localhost:27017,localhost:27018,localhost:27019/main?replicaSet=base',
  secret: env.PAYLOAD_SECRET,
} as const;
