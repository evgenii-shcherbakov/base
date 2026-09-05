import { Logger, OnApplicationShutdown } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Owns the single shared ioredis connection. Queues reuse it as-is; BullMQ workers
 * duplicate it internally for their blocking commands, so each worker still costs
 * one extra connection.
 */
export class RedisConnectionService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisConnectionService.name);
  private readonly client: Redis;

  constructor(url: string, options: RedisOptions) {
    this.client = new Redis(url, options);
  }

  getClient(): Redis {
    return this.client;
  }

  // Registered last in the module so its hook runs after the workers/queues are closed.
  async onApplicationShutdown(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      this.logger.warn('Failed to close the Redis connection', error);
    }
  }
}
