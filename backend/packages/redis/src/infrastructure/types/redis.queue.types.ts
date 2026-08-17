/**
 * One controller method bound to one event: the pair drives both the queue the
 * consumer worker listens on and the entry published into the Redis-backed
 * subscription registry the mediator reads.
 */
export type RedisQueueSubscription = {
  eventId: string;
  consumerId: string;
  queueName: string;
  /** Overrides the global `REDIS_WORKER_CONCURRENCY` for this subscription's worker. */
  concurrency?: number;
};
