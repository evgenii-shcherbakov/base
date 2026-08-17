import Redis from 'ioredis';
import { RedisQueueSubscription } from '../types';

/** How long a mediator may reuse a cached consumer set before re-reading Redis. */
export const SUBSCRIPTION_CACHE_TTL_MS = 5000;

type CachedConsumers = {
  consumerIds: string[];
  expiresAt: number;
};

/**
 * Distributed subscription registry. BullMQ is a work queue, so a mediator has to know
 * every consumer of an event — including consumers living in other services. Each
 * process publishes its own subscriptions at bootstrap (`SADD`), mediators read the set
 * back (`SMEMBERS`) when fanning out.
 *
 * Entries are durable on purpose: they are never removed on shutdown, so jobs pile up in
 * a stopped consumer's queue and are processed once it returns — the JetStream durable
 * consumer semantics. Retiring a consumer is a manual `SREM` plus queue removal.
 */
export class RedisSubscriptionRegistry {
  private readonly consumersCache = new Map<string, CachedConsumers>();

  constructor(
    private readonly connection: Redis,
    private readonly getSubscriptionKey: (eventId: string) => string,
    private readonly cacheTtlMs: number = SUBSCRIPTION_CACHE_TTL_MS,
  ) {}

  async publish(subscriptions: RedisQueueSubscription[]): Promise<void> {
    if (!subscriptions.length) {
      return;
    }

    const pipeline = this.connection.pipeline();

    subscriptions.forEach((subscription) => {
      pipeline.sadd(this.getSubscriptionKey(subscription.eventId), subscription.consumerId);
    });

    await pipeline.exec();

    subscriptions.forEach((subscription) => {
      this.consumersCache.delete(subscription.eventId);
    });
  }

  async getConsumers(eventId: string): Promise<string[]> {
    const cached = this.consumersCache.get(eventId);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.consumerIds;
    }

    const consumerIds = await this.connection.smembers(this.getSubscriptionKey(eventId));

    this.consumersCache.set(eventId, {
      consumerIds,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return consumerIds;
  }
}
