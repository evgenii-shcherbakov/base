import { Logger, OnApplicationShutdown } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Owns the cache's own ioredis connection — deliberately not the one
 * `@backend/event-bus-redis` opens: sharing it would make the cache unusable without the
 * event bus, and would drag bullmq into a service that only wants a key-value store.
 *
 * Registered last in the module so its shutdown hook runs after the store's.
 */
export class CacheConnectionService implements OnApplicationShutdown {
  private readonly logger = new Logger(CacheConnectionService.name);
  private readonly client: Redis;

  constructor(url: string, options: RedisOptions) {
    this.client = new Redis(url, options);
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * `quit()` is a command, not a socket operation: on a client that is not `ready` it waits in
   * the offline queue, which on a shutdown *because* Redis went away means waiting forever.
   * So only a ready client gets the graceful goodbye, and either way the socket is torn down —
   * a short-lived process that closes while still connecting would otherwise leave a handle
   * open and never exit.
   */
  async onApplicationShutdown(): Promise<void> {
    if (this.client.status !== 'ready') {
      this.client.disconnect();

      return;
    }

    try {
      await this.client.quit();
    } catch (error) {
      this.logger.warn('Failed to close the cache Redis connection', error);
    } finally {
      this.client.disconnect();
    }
  }
}
