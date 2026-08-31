import { RedisQueueRegistry } from './redis.queue-registry';

export * from './redis.queue-registry';

export const globalQueueRegistry = new RedisQueueRegistry();
