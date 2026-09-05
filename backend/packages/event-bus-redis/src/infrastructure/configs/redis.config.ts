import { validateEnv } from '@packages/common';
import { DefaultJobOptions, QueueOptions, WorkerOptions } from 'bullmq';
import { kebabCase } from 'change-case-all';
import { RedisOptions } from 'ioredis';
import zod from 'zod';
import { RedisParkingOptions } from '../types';

const env = validateEnv({
  REDIS_URL: zod.string().default('redis://localhost:6379'),
  REDIS_QUEUE_PREFIX: zod.string().default('bull'),
  REDIS_WORKER_CONCURRENCY: zod.coerce.number().int().positive().default(1),
  // Configurable for the same reason NATS_MAX_DELIVER is: the production ladder takes minutes
  // to walk, so the e2e suite pins a short one.
  REDIS_JOB_ATTEMPTS: zod.coerce.number().int().positive().default(10),
  REDIS_JOB_BACKOFF_DELAY: zod.coerce.number().int().positive().default(1000),
  REDIS_EVENT_BUS_NAMESPACE: zod.string().default('event-bus'),
  // Parking buffer for events fanned out while nobody was subscribed yet. Mirrors the job
  // retention above: `count` of `removeOnComplete`, `age` of `removeOnFail`. 0 disables it.
  REDIS_PARKING_MAX_LENGTH: zod.coerce.number().int().nonnegative().default(1000),
  REDIS_PARKING_TTL: zod.coerce.number().int().positive().default(86400),
  // 0 = dual stack, 4 = IPv4 only, 6 = IPv6 only. Needed on IPv6-only private networks
  // (Railway): ioredis resolves an A record by default and fails with ENOTFOUND.
  REDIS_IP_FAMILY: zod.coerce
    .number()
    .int()
    .refine((value) => [0, 4, 6].includes(value), { message: 'must be 0, 4 or 6' })
    .default(0),
});

export const redisConfig = () => {
  const redisUrl = env.REDIS_URL;

  return {
    getConnectionUrl: (): string => redisUrl,
    getConnectionOptions: (host: string): RedisOptions => {
      const clientName = kebabCase(host);

      return {
        connectionName: `${clientName}-redis-client`,
        // BullMQ requires blocking commands to retry forever.
        maxRetriesPerRequest: null,
        family: env.REDIS_IP_FAMILY,
      };
    },
    getQueueOptions: (): Omit<QueueOptions, 'connection'> => {
      return {
        prefix: env.REDIS_QUEUE_PREFIX,
        defaultJobOptions: {
          // Mirrors the NATS consumer: maxDeliver 10, then the job lands in `failed` (the DLQ).
          attempts: env.REDIS_JOB_ATTEMPTS,
          backoff: { type: 'exponential', delay: env.REDIS_JOB_BACKOFF_DELAY },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 },
        } satisfies DefaultJobOptions,
      };
    },
    getWorkerOptions: (): Omit<WorkerOptions, 'connection'> => {
      return {
        prefix: env.REDIS_QUEUE_PREFIX,
        // 1 by default, mirroring the NATS `maxAckPending: 1` in-order delivery.
        concurrency: env.REDIS_WORKER_CONCURRENCY,
      };
    },
    /** Set of consumer ids subscribed to an event, read by the mediator on fan-out. */
    getSubscriptionKey: (eventId: string): string => {
      return `${env.REDIS_EVENT_BUS_NAMESPACE}:subs:${eventId}`;
    },
    /** Channel carrying the ids of events whose consumer set has just changed. */
    getInvalidationChannel: (): string => {
      return `${env.REDIS_EVENT_BUS_NAMESPACE}:subs:changed`;
    },
    /** List holding the events fanned out before anyone was subscribed to them. */
    getParkingKey: (eventId: string): string => {
      return `${env.REDIS_EVENT_BUS_NAMESPACE}:parked:${eventId}`;
    },
    getParkingOptions: (): RedisParkingOptions => {
      return {
        maxLength: env.REDIS_PARKING_MAX_LENGTH,
        ttlSeconds: env.REDIS_PARKING_TTL,
      };
    },
  } as const;
};

export type RedisConfig = ReturnType<typeof redisConfig>;
