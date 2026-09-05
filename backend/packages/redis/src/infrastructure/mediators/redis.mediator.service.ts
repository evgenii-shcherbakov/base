import { resolveErrorMessage } from '@backend/common';
import { Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Job, Worker, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';
import { RedisQueueClient } from '../clients';
import { buildConsumerQueueName, buildFanOutJobId } from '../constants';
import { RedisParkingService } from '../parking';
import { RedisSubscriptionRegistry } from '../registry';

export type RedisMediatorParams = {
  eventIds: string[];
  connection: Redis;
  client: RedisQueueClient;
  subscriptionRegistry: RedisSubscriptionRegistry;
  parking: RedisParkingService;
  workerOptions: Omit<WorkerOptions, 'connection'>;
};

/**
 * Fan-out stage. BullMQ delivers a job to exactly one worker, so an event queue cannot
 * be consumed by several subscribers directly. This mediator drains the event queue
 * (`auth.user.create`) and re-publishes each job into every subscriber queue
 * (`auth.user.create@storage.file`, …) listed in the Redis subscription registry.
 *
 * It only runs for the events owned by its own host, so every event has exactly one
 * mediator and routing stays deterministic. It lives outside the server strategy on
 * purpose: an emit-only service still has to fan out the events it owns.
 */
export class RedisMediatorService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RedisMediatorService.name);
  private readonly workers: Worker[] = [];

  constructor(private readonly params: RedisMediatorParams) {}

  onApplicationBootstrap(): void {
    this.params.eventIds.forEach((eventId) => {
      const worker = new Worker(eventId, (job: Job) => this.fanOut(eventId, job), {
        ...this.params.workerOptions,
        connection: this.params.connection,
      });

      worker.on('failed', (job, error) => {
        // Same reason as in the server strategy: a wrapper error (an ioredis `AggregateError`
        // when the node is unreachable) carries no message of its own.
        this.logger.error(
          `Fan-out of "${eventId}" job ${job?.id} failed: ${resolveErrorMessage(error, 'unknown error')}`,
        );
      });

      this.workers.push(worker);
    });

    if (this.workers.length) {
      this.logger.log(`Mediating events: ${this.params.eventIds.join(', ')}`);
    }
  }

  private async fanOut(eventId: string, job: Job): Promise<void> {
    let consumerIds = await this.params.subscriptionRegistry.getConsumers(eventId);

    if (!consumerIds.length) {
      // Parked rather than dropped: a consumer that has not published its subscription yet
      // replays this entry the first time it registers.
      await this.params.parking.park(eventId, { id: job.id, data: job.data });

      // It may have registered between the cached read above and the park, in which case its
      // replay ran too early to see this entry — re-read past the cache and fan out normally.
      // A duplicate is harmless here: both paths use the same deterministic job id.
      consumerIds = await this.params.subscriptionRegistry.getConsumers(eventId, { fresh: true });

      if (!consumerIds.length) {
        this.logger.debug(`No consumers registered for "${eventId}", job ${job.id} parked`);
        return;
      }
    }

    // Deriving the target job id from the source one makes the fan-out idempotent: a
    // redelivered job re-adds the same ids and BullMQ ignores the duplicates.
    const jobId = job.id ? buildFanOutJobId(eventId, job.id) : undefined;

    await Promise.all(
      consumerIds.map((consumerId) => {
        const queueName = buildConsumerQueueName(eventId, consumerId);
        return this.params.client.getQueue(queueName).add(eventId, job.data, { jobId });
      }),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      this.workers.map(async (worker) => {
        try {
          await worker.close();
        } catch (error) {
          this.logger.warn(`Failed to close the mediator worker "${worker.name}"`, error);
        }
      }),
    );

    this.workers.length = 0;
  }
}
