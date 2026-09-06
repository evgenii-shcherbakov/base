import { validateEnv } from '@packages/common';
import { RedisOptions } from 'ioredis';
import zod from 'zod';
import { CacheDriver } from '../../domain';

const env = validateEnv({
  // The same variable `@backend/event-bus-redis` reads: one Redis is what docker-compose and
  // the deployments actually run, and the two subsystems share it through disjoint key
  // prefixes rather than through a second URL nobody sets.
  REDIS_URL: zod.string().default('redis://localhost:6379'),
  // Set only when the cache has to live on its own instance — a cache that is evicted under
  // memory pressure has no business sharing a server with the event bus' durable queues.
  CACHE_REDIS_URL: zod.string().optional(),
  // `memory` is process-local and survives nothing: dev without a broker, and tests.
  CACHE_DRIVER: zod.enum(['redis', 'memory']).default('redis'),
  CACHE_KEY_PREFIX: zod.string().default('cache'),
  CACHE_TTL: zod.coerce.number().int().nonnegative().default(300),
  // 0 = dual stack, 4 = IPv4 only, 6 = IPv6 only. Mirrors REDIS_IP_FAMILY: ioredis resolves an
  // A record by default and fails with ENOTFOUND on an IPv6-only private network.
  CACHE_IP_FAMILY: zod.coerce
    .number()
    .int()
    .refine((value) => [0, 4, 6].includes(value), { message: 'must be 0, 4 or 6' })
    .default(0),
});

/**
 * Read synchronously by `CacheModule.forRoot`, which has to know the driver before Nest
 * resolves anything: with `memory` no ioredis connection is created at all.
 */
export const getCacheDriver = (): CacheDriver => env.CACHE_DRIVER;

export const cacheConfig = () =>
  ({
    getDriver: (): CacheDriver => env.CACHE_DRIVER,
    getConnectionUrl: (): string => env.CACHE_REDIS_URL ?? env.REDIS_URL,
    getConnectionOptions: (namespace: string): RedisOptions => {
      // Shows up in `CLIENT LIST`, so it only has to be readable: a namespace already looks
      // like `auth` / `storage`, anything else is folded into dashes.
      const clientName = (namespace || 'cache').toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return {
        connectionName: `${clientName}-cache-client`,
        family: env.CACHE_IP_FAMILY,
      };
    },
    getKeyPrefix: (): string => env.CACHE_KEY_PREFIX,
    /** Seconds. `0` means entries are stored without an expiry unless a call passes one. */
    getDefaultTtl: (): number => env.CACHE_TTL,
  }) as const;

export type CacheConfig = ReturnType<typeof cacheConfig>;
