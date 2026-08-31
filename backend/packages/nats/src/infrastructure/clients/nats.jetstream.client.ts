import { JSONCodec, JetStreamClient, PubAck } from 'nats';
import { NatsConnectionService } from '../connections';

/**
 * Producer side of the adapter, the counterpart of `RedisQueueClient`. The generated
 * `Nats<Service>EventBusClientImpl` classes emit through it.
 *
 * Replaces `NatsJetStreamClientProxy` from the dropped wrapper library: the emit API is now
 * promise-based like the Redis one instead of RxJS-based.
 */
export class NatsJetStreamClient {
  private readonly codec = JSONCodec();
  private readonly jetStream: JetStreamClient;

  constructor(connectionService: NatsConnectionService) {
    this.jetStream = connectionService.getJetStream();
  }

  emit<Event>(subject: string, event: Event): Promise<PubAck> {
    return this.jetStream.publish(subject, this.codec.encode(event));
  }

  emitMany<Event>(subject: string, events: Event[]): Promise<PubAck[]> {
    if (!events.length) {
      return Promise.resolve([]);
    }

    // Sequential on purpose: JetStream assigns stream sequences in publish order, so this is
    // what keeps a batch ordered for the consumers.
    return events.reduce(async (acc: Promise<PubAck[]>, event: Event): Promise<PubAck[]> => {
      const acks = await acc;
      acks.push(await this.emit(subject, event));

      return acks;
    }, Promise.resolve([]));
  }
}
