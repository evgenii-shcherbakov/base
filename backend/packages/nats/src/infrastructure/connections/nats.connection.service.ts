import { Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  ConnectionOptions,
  JetStreamClient,
  JetStreamManager,
  NatsConnection,
  connect,
} from 'nats';

/**
 * Owns the single shared NATS connection, the way `RedisConnectionService` owns the ioredis
 * one. The publisher, the stream provisioner and every consumer of the process multiplex over
 * it — NATS needs no extra socket per subscription.
 *
 * `connect()` is async, so the connection is established by the static `create()` and handed
 * to the module through an async factory.
 */
export class NatsConnectionService implements OnApplicationShutdown {
  private readonly logger = new Logger(NatsConnectionService.name);

  private constructor(private readonly connection: NatsConnection) {}

  static async create(options: ConnectionOptions): Promise<NatsConnectionService> {
    return new NatsConnectionService(await connect(options));
  }

  getConnection(): NatsConnection {
    return this.connection;
  }

  getJetStream(): JetStreamClient {
    return this.connection.jetstream();
  }

  getJetStreamManager(): Promise<JetStreamManager> {
    return this.connection.jetstreamManager();
  }

  // Registered last in the module so its hook runs after the consumers are stopped. `drain()`
  // flushes what is already buffered before closing, unlike `close()`.
  async onApplicationShutdown(): Promise<void> {
    try {
      await this.connection.drain();
    } catch (error) {
      this.logger.warn('Failed to close the NATS connection', error);
    }
  }
}
