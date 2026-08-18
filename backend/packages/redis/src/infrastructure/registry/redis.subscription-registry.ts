import { Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
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
 *
 * A brand-new subscription would stay invisible to already-running mediators for up to
 * `cacheTtlMs`, so publishing also announces the changed event ids on a pub/sub channel
 * and every process drops the matching cache entry immediately.
 */
export class RedisSubscriptionRegistry implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RedisSubscriptionRegistry.name);
  private readonly consumersCache = new Map<string, CachedConsumers>();
  private subscriber?: Redis;

  constructor(
    private readonly connection: Redis,
    private readonly getSubscriptionKey: (eventId: string) => string,
    private readonly invalidationChannel: string,
    private readonly cacheTtlMs: number = SUBSCRIPTION_CACHE_TTL_MS,
  ) {}

  /**
   * Runs before the mediator's own bootstrap hook (the module registers this provider
   * first), so the channel is live before the first fan-out reads the registry.
   */
  async onApplicationBootstrap(): Promise<void> {
    // ioredis puts a subscribed connection into subscriber mode, where regular commands
    // are refused — the channel needs a socket of its own.
    const subscriber = this.connection.duplicate();

    subscriber.on('message', (_channel: string, eventId: string) => {
      this.consumersCache.delete(eventId);
    });

    subscriber.on('error', (error: Error) => {
      this.logger.warn('Subscription invalidation channel error', error);
    });

    try {
      await subscriber.subscribe(this.invalidationChannel);
      this.subscriber = subscriber;
    } catch (error) {
      // Losing the channel only costs freshness — the TTL cache still expires on its own.
      this.logger.warn('Failed to subscribe to the invalidation channel', error);
      await subscriber.quit().catch(() => undefined);
    }
  }

  async publish(subscriptions: RedisQueueSubscription[]): Promise<void> {
    if (!subscriptions.length) {
      return;
    }

    const pipeline = this.connection.pipeline();

    subscriptions.forEach((subscription) => {
      pipeline.sadd(this.getSubscriptionKey(subscription.eventId), subscription.consumerId);
    });

    const results = await pipeline.exec();

    subscriptions.forEach((subscription) => {
      this.consumersCache.delete(subscription.eventId);
    });

    // `SADD` answers 1 only when the consumer was not registered yet, so a restart of an
    // already-known subscriber announces nothing.
    const addedEventIds = new Set(
      subscriptions
        .filter((_subscription, index) => results?.[index]?.[1] === 1)
        .map((subscription) => subscription.eventId),
    );

    await this.announce(Array.from(addedEventIds));
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

  async onApplicationShutdown(): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    try {
      await this.subscriber.quit();
    } catch (error) {
      this.logger.warn('Failed to close the invalidation channel connection', error);
    }

    this.subscriber = undefined;
  }

  private async announce(eventIds: string[]): Promise<void> {
    if (!eventIds.length) {
      return;
    }

    const pipeline = this.connection.pipeline();

    eventIds.forEach((eventId) => {
      pipeline.publish(this.invalidationChannel, eventId);
    });

    try {
      await pipeline.exec();
    } catch (error) {
      this.logger.warn('Failed to announce the new subscriptions', error);
    }
  }
}
