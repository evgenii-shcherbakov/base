import { RedisAdapter } from '@compiler/adapters/redis/redis.adapter';
import { BACKEND_PACKAGES_DIR_ROOT } from '@packages/compiler-utils';
import { join } from 'path';

export const Redis = RedisAdapter.createFactory({
  name: 'redis',
  outputPath: join(BACKEND_PACKAGES_DIR_ROOT, 'event-bus-redis', 'src', 'generated', 'index.ts'),
  templatePath: join(__dirname, 'templates'),
});
