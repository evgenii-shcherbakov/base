# CLAUDE.md — @backend/redis

Guidance for working inside `backend/packages/redis`. The event-bus codegen flow and the abstract
ports are in the root `CLAUDE.md` *Event-bus codegen pipeline* section — read it first. This file is
the package internals: the Redis/BullMQ runtime.

**Status: implemented but not wired anywhere.** `@backend/nats` is still the live transport; no
service imports `RedisModule` yet, and no `backend.*` container gets `REDIS_URL`. The
`docker-compose.yml` `redis` service (profiles `local`/`all`) exists for local experiments.

## Dual nature

`src/generated/index.ts` is **emitted by the `@backend/event-bus` compiler** (its Redis adapter) —
transports (`Redis<Service>Transport`, service-scoped naming, host dropped), subscriber/handler
interfaces, `RedisClientFactory` and `REDIS_HOST_EVENTS`. Everything else (`infrastructure/`,
`interface/`, `redis.module.ts`) is hand-written runtime. There is no compiler here.

## Why it does not look like NATS

JetStream is pub/sub: one subject, many durable consumers. BullMQ is a **work queue** — a job is
delivered to exactly one worker — so a single event queue cannot feed several subscribers. Hence the
three-stage topology:

```
emit  →  Queue('auth.user.create')                          the event queue (one owner: the host)
         Worker('auth.user.create')                         mediator, fan-out stage
           → SMEMBERS event-bus:subs:auth.user.create       ['storage.file', 'storage.storage-object']
           → Queue('auth.user.create@storage.file').add(…)  one queue per (event, controller)
         Worker('auth.user.create@storage.file')            consumer, calls the controller method
```

Queue names: the event id is the dot-cased `host.service.event` (`auth.user.create`) — the same
`eventId` NATS kebab-cases, used verbatim here. A subscriber queue appends `@<consumerId>`.
**`:` cannot be used**: BullMQ's `QueueBase` throws `Queue name cannot contain :` because `:` is the
Redis key delimiter (`<prefix>:<queueName>:<type>`). The same rule bites job ids, plus numeric ids
are rejected — that is why `buildFanOutJobId()` prefixes the source job id with the event id.

## Layer map (hexagon)

Concrete adapter for the abstract ports of `@backend/event-bus`:

- **infrastructure/** — driven/outbound: `configs/` (connection, queue/worker/job options, subscription
  key), `constants/` (DI tokens, queue-name helpers), `types/` (`RedisQueueSubscription`), `utils/`
  (`globalQueueRegistry`), `connections/` (the shared ioredis client), `clients/`
  (`RedisQueueClient` — the queue pool used for emitting), `registry/` (`RedisSubscriptionRegistry`),
  `mediators/` (`RedisMediatorService` — the fan-out workers).
- **interface/** — driving/inbound: `decorators/` (`@RedisController`, `@RedisEvent`), `contexts/`
  (`RedisJobContext`), `interceptors/` (error logging), `servers/` (`RedisEventBusServer`, the
  `CustomTransportStrategy` that runs the consumer workers).
- **redis.module.ts** — composition root: `forRoot` (connection + client + registry + mediator, and
  the server strategy unless `onlyEmitting`), `forFeature` (bind abstract bus → concrete client).
- **generated/** — one codegen file spanning both layers; never hand-edit.

Public API is the flat root `src/index.ts` barrel. Inside the package `@/*` aliases `src/*`.

## Module (`redis.module.ts`)

- `RedisModule.forRoot({ host: EventBusHost, onlyEmitting? })` — global. Always provides the shared
  connection, `RedisQueueClient`, `RedisSubscriptionRegistry` and the **mediator** — an emit-only
  service still has to fan out the events it owns, so `onlyEmitting` does not disable it. Unless
  `onlyEmitting`, it also provides `REDIS_MICROSERVICE_OPTIONS`, connected in `main.ts` via
  `app.connectMicroservice(app.get(REDIS_MICROSERVICE_OPTIONS))`.
- `RedisModule.forFeature({ EventBus })` — binds an abstract bus to its concrete client via
  `RedisClientFactory`, exactly like `NatsModule.forFeature`.
- The connection provider is registered **last** on purpose: Nest runs shutdown hooks in provider
  order, so the socket closes after the workers and queues.

## Controllers

```ts
@RedisController({ consumer: 'storage.file' })
@RedisStorageObjectTransport.ControllerMethods()
export class RedisStorageObjectController
  implements RedisStorageObjectEventController, RedisUserCreateEventHandler
{
  async onParentUpdate(event: StorageObjectParentUpdateEvent): Promise<void> {}

  @RedisEvent(RedisUserTransport.CREATE)
  async onUserCreate(@Payload() event: NestAuth.User, @Ctx() context: RedisJobContext) {}
}
```

- `consumer` is the controller's system-wide id (`<host>.<module>`), the second half of its queue
  names. It is declared once, in `@RedisController`.
- **Decorator order matters.** Method decorators run before class decorators, so `ControllerMethods()`
  and `@RedisEvent` can only store the bare event id; `@RedisController` runs last (class decorators
  apply bottom-up) and rewrites `PATTERN_METADATA` into `<eventId>@<consumerId>`. Keep
  `@RedisController` **above** the transport decorator. If a pattern reaches the strategy without the
  suffix, bootstrap fails with an explicit message instead of quietly idling a queue.
- The `context?: RedisJobContext` parameter in the generated interfaces only gets injected when it is
  decorated with `@Ctx()` (and then the payload needs `@Payload()`) — standard Nest behaviour, same as
  the NATS context.

## Delivery semantics

Per-job: `attempts: 10` with exponential backoff from 1s, `removeOnComplete` after 1h/1000 jobs,
`removeOnFail` after 24h — the `failed` set is the DLQ. There is no ack/nak: a rejected processor
marks the job failed and BullMQ schedules the retry, so **handlers must be idempotent**.
`RedisControllerInterceptor` re-wraps unknown errors into `RpcException` so the real message survives
`RpcExceptionsHandler` and lands in the job's `failedReason` instead of "Internal server error".
Worker `concurrency` defaults to 1 (the NATS `maxAckPending: 1` equivalent) — override globally with
`REDIS_WORKER_CONCURRENCY` or per controller with `@RedisController({ concurrency })`.

## Registries

- `globalQueueRegistry` (module singleton, mirrors `globalStreamRegistry`) accumulates
  `event → controller` subscriptions as `@RedisController` runs on class load; the strategy reads it
  at `listen()` to spawn the workers.
- `RedisSubscriptionRegistry` publishes those subscriptions into Redis (`SADD
  event-bus:subs:<eventId> <consumerId>`) so mediators in **other** processes can fan out to them, and
  reads them back with a 5s TTL cache. Entries are durable: they are never removed on shutdown, so
  jobs pile up in a stopped consumer's queue and are delivered on restart (JetStream durable-consumer
  semantics). Retiring a consumer is a manual `SREM` plus queue cleanup.

## Env

`REDIS_URL` (default `redis://localhost:6379`), `REDIS_QUEUE_PREFIX` (default `bull`),
`REDIS_WORKER_CONCURRENCY` (default `1`), `REDIS_EVENT_BUS_NAMESPACE` (default `event-bus`).

## Commands & gotchas

```bash
pnpm build            # format:generated → tsdown → dist (cjs + d.ts)
pnpm dev / lint / format / format:generated / reset
```

- No `compile` here — `src/generated/` is regenerated by `pnpm compile:event-bus`; change events in
  `EventBusStrategy`, never hand-edit `generated/`.
- Every worker costs a Redis connection (BullMQ duplicates the shared one for blocking commands):
  mediators for the host's own events plus one per subscription. Watch the count as events grow; the
  cheaper alternative is fanning out directly in the producer instead of via the mediator.
- First-start race: an event emitted before a brand-new consumer has published its subscription
  passes it by (plus the mediator's 5s cache). The registry is durable, so the window only exists on
  the very first boot of a new subscription.
- Handlers must be idempotent (up to 10 attempts, plus at-least-once fan-out).
- cjs-only; consumers resolve `dist/`, rebuild after changes.
