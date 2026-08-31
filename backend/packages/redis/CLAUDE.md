# CLAUDE.md — @backend/redis

Guidance for working inside `backend/packages/redis`. The event-bus codegen flow and the abstract
ports are in the root `CLAUDE.md` *Event-bus codegen pipeline* section — read it first. This file is
the package internals: the Redis/BullMQ runtime.

**Status: the live transport.** `backend.auth` and `backend.storage` run on it (`RedisModule.forRoot`
+ `REDIS_MICROSERVICE_OPTIONS`, subscribers under `interface/redis/`); `@backend/nats` is dormant.
`docker-compose.yml` runs a `redis` service in the `local`/`all` profiles and passes `REDIS_URL` to
both services. `backend.api-gateway` uses no event bus at all.

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
Worker `concurrency` defaults to 1 (the NATS `maxAckPending: 1` equivalent) — override globally with
`REDIS_WORKER_CONCURRENCY` or per controller with `@RedisController({ concurrency })`.

### Keeping `failedReason` readable

The `failed` set is the DLQ, so a job sitting there has to say why on its own — correlating its
timestamp against the service logs is not triage. BullMQ persists `error.message`, and two things
erase it on the way, so both are handled:

- `RedisControllerInterceptor` re-wraps unknown errors into `RpcException`, otherwise
  `RpcExceptionsHandler` replaces them with a bare "Internal server error". This is also the point
  where the original error object is dropped — the handler rejects with a plain `{ status, message }`
  — so the message must be resolved there, while the `cause` chain still exists.
- Wrapper errors often carry no message of their own. MikroORM 7 reports a driver failure as a
  `DriverException` built from the underlying error, and a database that is simply down surfaces as
  Node's `AggregateError` (one entry per address tried) — both message-less, with the real reason
  ("connect ECONNREFUSED ::1:5432") two levels down.

`resolveErrorMessage()` from **`@backend/common`** is the shared answer: it takes the first non-empty
message in the `cause` chain, descending into an `AggregateError`'s `errors`, and falls back to the
error's class name (`DriverException`) before the caller's default (`REDIS_ERROR_FALLBACK`). Both the
interceptor and `RedisEventBusServer.toError` use it — the latter still guards handlers that throw
outside the interceptor's observable. It lives in `@backend/common` rather than here because
`@backend/nats` needs it for the same reason (no DLQ there at all — the log line is the only record).

## Registries

- `globalQueueRegistry` (module singleton, mirrors `globalStreamRegistry`) accumulates
  `event → controller` subscriptions as `@RedisController` runs on class load; the strategy reads it
  at `listen()` to spawn the workers.
- `RedisSubscriptionRegistry` publishes those subscriptions into Redis (`SADD
  event-bus:subs:<eventId> <consumerId>`) so mediators in **other** processes can fan out to them, and
  reads them back with a 5s TTL cache. Entries are durable: they are never removed on shutdown, so
  jobs pile up in a stopped consumer's queue and are delivered on restart (JetStream durable-consumer
  semantics). Retiring a consumer is a manual `SREM` plus queue cleanup.
- **Cache invalidation.** A newly registered subscription would stay invisible to already-running
  mediators until their TTL expires, so `publish()` also announces the changed event ids on
  `event-bus:subs:changed` and every process drops the matching cache entry at once. Only event ids
  whose `SADD` actually returned 1 are announced, so restarting a known subscriber is silent. The
  channel needs its own socket (`connection.duplicate()`): ioredis refuses regular commands on a
  subscribed connection. Losing the channel is a soft failure — it is logged, and the TTL still
  expires on its own.

## Env

`REDIS_URL` (default `redis://localhost:6379`), `REDIS_QUEUE_PREFIX` (default `bull`),
`REDIS_WORKER_CONCURRENCY` (default `1`), `REDIS_EVENT_BUS_NAMESPACE` (default `event-bus`),
`REDIS_IP_FAMILY` (default `0`).

`REDIS_IP_FAMILY` is the ioredis `family` option — `0` dual stack, `4` IPv4 only, `6` IPv6 only. It
defaults to dual stack because managed private networks are often IPv6-only (Railway's
`*.railway.internal`), where ioredis' default A-record lookup fails with `ENOTFOUND`. Force `6` if
reconnects turn out flaky on such a network.

## Commands & gotchas

```bash
pnpm build            # format:generated → tsdown → dist (cjs + d.ts)
pnpm test             # jest; single file: pnpm test -- redis.queue.constants
pnpm dev / test:watch / lint / format / format:generated / reset
```

- No `compile` here — `src/generated/` is regenerated by `pnpm compile:event-bus`; change events in
  `EventBusStrategy`, never hand-edit `generated/`.
- Specs sit next to their subject (`*.spec.ts` under `src/`), are excluded from the turbo `build`
  inputs, and are not part of the tsdown entry graph — but they *are* in the tsconfig, so `tsc` and
  `eslint` type-check them. Target lib is ES2021: assign `cause` via `Object.assign`, not `err.cause =`.
- Every worker costs a Redis connection (BullMQ duplicates the shared one for blocking commands):
  mediators for the host's own events plus one per subscription. Watch the count as events grow; the
  cheaper alternative is fanning out directly in the producer instead of via the mediator.
- First-start race: an event emitted before a brand-new consumer has published its subscription
  passes it by — the mediator logs `No consumers registered … dropped` and completes the job. The
  registry is durable and new subscriptions invalidate the mediators' caches immediately, so the
  window only exists on the very first boot of a subscription (or after the Redis data is wiped) —
  a redeploy of a known subscriber is safe, its jobs simply wait in its queue. Seeding the registry
  by hand closes it on a fresh environment:
  ```bash
  redis-cli -u "$REDIS_URL" SADD event-bus:subs:auth.user.create storage.storage-object
  ```
  A dropped event can also be replayed from the source queue's `completed` set within the hour
  (`removeOnComplete: { age: 3600 }`). Failing the job instead of dropping it is **not** an option:
  events with no subscriber at all (`storage.image.delete`) would retry ten times and fill the DLQ.
- Handlers must be idempotent (up to 10 attempts, plus at-least-once fan-out).
- cjs-only; consumers resolve `dist/`, rebuild after changes.
