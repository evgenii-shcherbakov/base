import { MongooseModuleOptions } from '@nestjs/mongoose';
import { MongoValidationSchema, validateEnv } from '@packages/common';

const env = validateEnv(MongoValidationSchema);

export const mongoConfig = () =>
  ({
    mongo: <MongooseModuleOptions>{
      uri:
        env.MONGODB_URL ??
        'mongodb://localhost:27017,localhost:27018,localhost:27019/main?replicaSet=base',
      autoIndex: true,
      autoCreate: true,
    },
  }) as const;

export type MongoConfig = ReturnType<typeof mongoConfig>;
