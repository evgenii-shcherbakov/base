import { resolveErrorMessage } from '@backend/common';
import { Logger } from '@nestjs/common';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { Job, Worker, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';
import { isObservable, lastValueFrom } from 'rxjs';
import {
  isConsumerQueueName,
  REDIS_ERROR_FALLBACK,
  RedisQueueRegistry,
  RedisQueueSubscription,
  RedisSubscriptionRegistry,
} from '@/infrastructure';
import { RedisJobContext } from '../contexts';

export type RedisEventBusServerParams = {
  connection: Redis;
  registry: RedisQueueRegistry;
  subscriptionRegistry: RedisSubscriptionRegistry;
  workerOptions: Omit<WorkerOptions, 'connection'>;
};

type WorkerListener = [string, (...args: any[]) => void];

/**
 * Consumer side of the adapter: a NestJS custom transport strategy that runs one BullMQ
 * worker per `<eventId>@<consumerId>` queue registered by `@RedisController()`.
 *
 * Bound in `main.ts` the same way NATS is:
 * `app.connectMicroservice(app.get(REDIS_MICROSERVICE_OPTIONS))`.
 */
export class RedisEventBusServer extends Server implements CustomTransportStrategy {
  protected readonly logger = new Logger(RedisEventBusServer.name);
  private readonly workers: Worker[] = [];
  private readonly listeners: WorkerListener[] = [];

  constructor(private readonly params: RedisEventBusServerParams) {
    super();
  }

  async listen(callback: (error?: unknown, ...args: unknown[]) => void): Promise<void> {
    try {
      const subscriptions = this.params.registry.getSubscriptions();

      this.assertSubscriptions(subscriptions);
      await this.params.subscriptionRegistry.publish(subscriptions);

      subscriptions.forEach((subscription) => {
        this.workers.push(this.createWorker(subscription));
      });

      if (subscriptions.length) {
        this.logger.log(
          `Subscribed to queues: ${subscriptions.map((item) => item.queueName).join(', ')}`,
        );
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  async close(): Promise<void> {
    await Promise.all(
      this.workers.map(async (worker) => {
        try {
          await worker.close();
        } catch (error) {
          this.logger.warn(`Failed to close the worker "${worker.name}"`, error);
        }
      }),
    );

    this.workers.length = 0;
  }

  on<EventKey extends string = string, EventCallback = (...args: any[]) => void>(
    event: EventKey,
    callback: EventCallback,
  ): void {
    this.listeners.push([event, callback as (...args: any[]) => void]);
    this.workers.forEach((worker) => worker.on(event as any, callback as any));
  }

  unwrap<T = Worker[]>(): T {
    return this.workers as T;
  }

  /**
   * Every event handler must resolve to a registered subscription. A pattern without the
   * consumer suffix means the controller never went through `@RedisController()`, and a
   * subscription without a handler means the registry and the controllers drifted apart —
   * both are bootstrap-time mistakes, so fail loudly instead of silently idling a queue.
   */
  private assertSubscriptions(subscriptions: RedisQueueSubscription[]): void {
    for (const [pattern, handler] of Array.from(this.messageHandlers.entries())) {
      if (!handler.isEventHandler || isConsumerQueueName(pattern)) {
        continue;
      }

      throw new Error(
        `Redis event pattern "${pattern}" is not bound to a consumer. Add @RedisController({ consumer: '<host>.<module>' }) above the transport decorator of the controller that handles it.`,
      );
    }

    for (const subscription of subscriptions) {
      if (this.getHandlerByPattern(subscription.queueName)) {
        continue;
      }

      throw new Error(
        `No handler registered for the Redis queue "${subscription.queueName}". Is the controller declared in a module?`,
      );
    }
  }

  private createWorker(subscription: RedisQueueSubscription): Worker {
    const worker = new Worker(
      subscription.queueName,
      (job: Job) => this.handleJob(subscription, job),
      {
        ...this.params.workerOptions,
        ...(subscription.concurrency ? { concurrency: subscription.concurrency } : {}),
        connection: this.params.connection,
      },
    );

    worker.on('failed', (job, error) => {
      this.logger.error(
        `Job ${job?.id} of "${subscription.queueName}" failed (attempt ${job?.attemptsMade}): ${error.message}`,
      );
    });

    this.listeners.forEach(([event, callback]) => worker.on(event as any, callback as any));

    return worker;
  }

  private async handleJob(subscription: RedisQueueSubscription, job: Job): Promise<void> {
    const handler = this.getHandlerByPattern(subscription.queueName);

    if (!handler) {
      throw new Error(`No handler registered for the Redis queue "${subscription.queueName}"`);
    }

    try {
      const result = await handler(job.data, new RedisJobContext([job, subscription]));

      // With interceptors in play the handler resolves to an observable — it has to be
      // subscribed to, otherwise the controller logic never runs and the job is acked early.
      if (isObservable(result)) {
        await lastValueFrom(result, { defaultValue: undefined });
      }
    } catch (error) {
      // Nest's rpc pipeline may reject with a plain string or object; BullMQ stores
      // `error.message` in `failedReason`, so normalise it into a real Error first.
      throw RedisEventBusServer.toError(error);
    }
  }

  private static toError(error: unknown): Error {
    if (typeof error === 'string') {
      return new Error(error);
    }

    const message = resolveErrorMessage(error, REDIS_ERROR_FALLBACK);

    if (!(error instanceof Error)) {
      return new Error(message);
    }

    // A message-less wrapper (a MikroORM `DriverException`, say) reaches this point when
    // the handler threw outside the interceptor's observable. Keep the original as the
    // cause and reuse its stack, but surface the recovered message — that is the string
    // BullMQ writes into `failedReason`.
    return error.message === message
      ? error
      : Object.assign(new Error(message), { cause: error, stack: error.stack });
  }
}
