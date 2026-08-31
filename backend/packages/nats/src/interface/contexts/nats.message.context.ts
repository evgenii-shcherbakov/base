import { BaseRpcContext } from '@nestjs/microservices';
import { JsMsg } from 'nats';
import { NatsConsumerSubscription } from '@/infrastructure';

type NatsMessageContextArgs = [JsMsg, NatsConsumerSubscription];

/**
 * Second argument of every NATS event handler — the counterpart of `RedisJobContext`, and the
 * replacement for `NatsJetStreamContext` from the dropped wrapper library.
 *
 * Unlike the Redis one it carries ack/nak: JetStream redelivers only what is left unacked, so
 * the interceptor has to answer for every message.
 */
export class NatsMessageContext extends BaseRpcContext<NatsMessageContextArgs> {
  constructor(args: NatsMessageContextArgs) {
    super(args);
  }

  getMessage(): JsMsg {
    return this.args[0];
  }

  getSubscription(): NatsConsumerSubscription {
    return this.args[1];
  }

  getSubject(): string {
    return this.args[1].subject;
  }

  getConsumerId(): string {
    return this.args[1].consumerId;
  }

  getDurable(): string {
    return this.args[1].durable;
  }

  getDeliveryCount(): number {
    return this.args[0].info.deliveryCount;
  }

  ack(): void {
    this.args[0].ack();
  }

  nak(delayMs?: number): void {
    this.args[0].nak(delayMs);
  }
}
