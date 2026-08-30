import { RedisQueueRegistry } from './redis.queue-registry';

export * from './redis.error.utils';
export * from './redis.queue-registry';

export const globalQueueRegistry = new RedisQueueRegistry();
