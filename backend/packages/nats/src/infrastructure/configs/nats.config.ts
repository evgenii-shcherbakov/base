import { validateEnv } from '@packages/common';
import { kebabCase } from 'change-case-all';
import {
  AckPolicy,
  ConnectionOptions,
  ConsumerConfig,
  DeliverPolicy,
  RetentionPolicy,
  StorageType,
  StreamConfig,
  nanos,
} from 'nats';
import zod from 'zod';
import { NatsConsumerSubscription, NatsStreamData } from '../types';

const env = validateEnv({
  NATS_URL: zod.string().default('nats://localhost:4222'),
  NATS_ACK_WAIT_MS: zod.coerce.number().int().positive().default(30000),
  NATS_MAX_DELIVER: zod.coerce.number().int().positive().default(10),
  NATS_CONSUMER_CONCURRENCY: zod.coerce.number().int().positive().default(1),
  // `all` replays the stream from the beginning the first time a durable is created, so a
  // subscriber added later still sees the events it missed. `new` is the Redis-adapter
  // behaviour, where the mediator drops an event nobody was registered for yet.
  NATS_DELIVER_POLICY: zod.enum(['all', 'new']).default('all'),
});

export const natsConfig = () => {
  const natsUrl = env.NATS_URL;

  return {
    getConnectionOptions: (host: string): ConnectionOptions => {
      const clientName = kebabCase(host);

      return {
        servers: [natsUrl],
        name: `${clientName}-nats-client`,
      };
    },
    getStreamConfig: (stream: NatsStreamData): Partial<StreamConfig> => {
      return {
        name: stream.name,
        subjects: stream.subjects,
        retention: RetentionPolicy.Limits,
        storage: StorageType.File,
      };
    },
    /**
     * One durable per (subject, consumer). `max_ack_pending` — not the client-side buffer —
     * is what bounds in-flight messages: the server withholds the next one until the current
     * is acked, which is the equivalent of the Redis worker `concurrency`.
     */
    getConsumerConfig: (subscription: NatsConsumerSubscription): Partial<ConsumerConfig> => {
      return {
        durable_name: subscription.durable,
        filter_subject: subscription.subject,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: env.NATS_DELIVER_POLICY === 'new' ? DeliverPolicy.New : DeliverPolicy.All,
        ack_wait: nanos(env.NATS_ACK_WAIT_MS),
        max_deliver: env.NATS_MAX_DELIVER,
        max_ack_pending: subscription.concurrency ?? env.NATS_CONSUMER_CONCURRENCY,
      };
    },
  } as const;
};

export type NatsConfig = ReturnType<typeof natsConfig>;
