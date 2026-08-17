import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { Job, JobsOptions, Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

/**
 * Producer side of the adapter: a lazily built pool of BullMQ queues over the shared
 * connection. Replaces `NatsJetStreamClientProxy` — the generated
 * `Redis<Service>EventBusClientImpl` classes emit through it, and the mediator uses
 * `getQueue()` to fan a job out into the subscriber queues.
 */
export class RedisQueueClient implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisQueueClient.name);
  private readonly queueByName = new Map<string, Queue>();

  constructor(
    private readonly connection: Redis,
    private readonly queueOptions: Omit<QueueOptions, 'connection'>,
  ) {}

  getQueue(queueName: string): Queue {
    const existingQueue = this.queueByName.get(queueName);

    if (existingQueue) {
      return existingQueue;
    }

    const queue = new Queue(queueName, { ...this.queueOptions, connection: this.connection });
    this.queueByName.set(queueName, queue);

    return queue;
  }

  emit<Event>(eventId: string, event: Event, options?: JobsOptions): Promise<Job<Event>> {
    return this.getQueue(eventId).add(eventId, event, options);
  }

  emitMany<Event>(eventId: string, events: Event[], options?: JobsOptions): Promise<Job<Event>[]> {
    if (!events.length) {
      return Promise.resolve([]);
    }

    return this.getQueue(eventId).addBulk(
      events.map((event) => ({ name: eventId, data: event, opts: options })),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      Array.from(this.queueByName.values()).map(async (queue) => {
        try {
          // Closes the queue only — the shared connection was passed in, so BullMQ leaves it open.
          await queue.close();
        } catch (error) {
          this.logger.warn(`Failed to close the queue "${queue.name}"`, error);
        }
      }),
    );

    this.queueByName.clear();
  }
}
