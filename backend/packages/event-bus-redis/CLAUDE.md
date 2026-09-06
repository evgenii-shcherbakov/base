# CLAUDE.md — @backend/event-bus-redis

Guidance for working inside `backend/packages/event-bus-redis`. The event-bus codegen flow and the abstract
ports are in the root `CLAUDE.md` *Event-bus codegen pipeline* section — read it first. This file is
the package internals: the Redis/BullMQ runtime.

**Status: the live transport.** `backend.auth` and `backend.storage` run on it (`RedisModule.forRoot`
+ `REDIS_MICROSERVICE_OPTIONS`, subscribers under `interface/redis/`); `@backend/event-bus-nats` is dormant.
`docker-compose.yml` runs a `redis` service in the `local`/`all` profiles and passes `REDIS_URL` to
both services. `backend.api-gateway` uses no event bus at all.

## Dual nature

`src/generated/index.ts` is **emitted by this package's own compiler** (`compiler/`, run as its own
turbo `compile` task) — transports (`Redis<Service>Transport`, service-scoped naming, host dropped),
subscriber/handler interfaces, `RedisClientFactory` and `REDIS_HOST_EVENTS`. Everything else
(`infrastructure/`, `interface/`, `redis.module.ts`) is hand-written runtime.

## Compiler — `compiler/`

```
compiler/
  main.ts            # builds the context, runs the adapter, writes ../src/generated/index.ts
  redis.adapter.ts   # EventBusAdapter subclass: imports, per-service transports, client, registry
  templates/*.pug    # redis.controller / redis.client / redis.registry
```

`main.ts` gets `EventBusAdapter` and `parseStrategy()` from `@backend/event-bus/compiler` — the
build-time entrypoint of the ports package — and parses `EventBusStrategy` itself. Nothing is handed
over from the ports package's own compile: each turbo task is a separate process, so the ~0.5 s parse
is repeated here in exchange for `pnpm compile` inside this package working on its own.

`outputPath` is local (`join(__dirname, '..', 'src', 'generated', 'index.ts')`), which is the point:
the task declares the output it actually writes, so a cache hit restores a complete tree. Turbo
cannot declare outputs outside a package, so the earlier arrangement — one compile in the ports
package writing into all three — left this file in no cache archive at all.

Editing a template here invalidates only this package. A strategy edit invalidates all three
`compile` tasks through the dependency hash.

## Why it does not look like NATS

JetStream is pub/sub: one subject, many durable consumers, so `@backend/event-bus-nats` scopes a subscription
by putting the consumer id in the **durable name** and stops there. BullMQ is a **work queue** — a
job is delivered to exactly one worker — so a single event queue cannot feed several subscribers,
and the consumer id has to name a real queue. Hence the three-stage topology:

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
  and parking keys), `constants/` (DI tokens, queue-name helpers), `types/`
  (`RedisQueueSubscription`), `utils/` (`globalQueueRegistry`), `connections/` (the shared ioredis
  client), `clients/` (`RedisQueueClient` — the queue pool used for emitting), `registry/`
  (`RedisSubscriptionRegistry`), `parking/` (`RedisParkingService` — the buffer for events with no
  consumers yet), `mediators/` (`RedisMediatorService` — the fan-out workers), `topology/`
  (`RedisTopologyReporter` — the bootstrap line reporting workers and connections).
- **interface/** — driving/inbound: `decorators/` (`@RedisController`, `@RedisEvent`), `contexts/`
  (`RedisJobContext`), `interceptors/` (error logging), `servers/` (`RedisEventBusServer`, the
  `CustomTransportStrategy` that runs the consumer workers).
- **redis.module.ts** — composition root: `forRoot` (connection + client + registry + mediator, and
  the server strategy unless `onlyEmitting`), `forFeature` (bind abstract bus → concrete client).
- **generated/** — one codegen file spanning both layers; never hand-edit.

Public API is the flat root `src/index.ts` barrel. Inside the package `@/*` aliases `src/*`.

## Module (`redis.module.ts`)

- `RedisModule.forRoot({ host: EventBusHost, onlyEmitting? })` — global. Always provides the shared
  connection, `RedisQueueClient`, `RedisSubscriptionRegistry`, `RedisParkingService`,
  `RedisTopologyReporter` and the **mediator** — an emit-only service still has to fan out the
  events it owns, so `onlyEmitting` does not disable it. Unless `onlyEmitting`, it also provides
  `REDIS_MICROSERVICE_OPTIONS`, connected in `main.ts` via
  `app.connectMicroservice(app.get(REDIS_MICROSERVICE_OPTIONS))`.
- `REDIS_TOPOLOGY` is injected by nobody: it exists for its bootstrap hook, which logs how many
  workers this process runs and roughly how many Redis connections that costs
  (`1 shared + 1 invalidation channel + 1 per worker` — BullMQ does not expose the sockets it
  duplicates, so the number is an estimate and is printed with a `~`). All of it is counted from
  the **declared** topology, never from live state: Nest calls a module's bootstrap hooks
  concurrently and the server strategy spawns its workers from `listen()`, so reading what has
  actually started would be a race.
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

Per-job: `REDIS_JOB_ATTEMPTS` attempts (10) with exponential backoff from `REDIS_JOB_BACKOFF_DELAY`
(1s), `removeOnComplete` after 1h/1000 jobs, `removeOnFail` after 24h — the `failed` set is the DLQ. There is no ack/nak: a rejected processor
marks the job failed and BullMQ schedules the retry, so **handlers must be idempotent**.
Worker `concurrency` defaults to 1 (the NATS `maxAckPending: 1` equivalent) — override globally with
`REDIS_WORKER_CONCURRENCY` or per controller with `@RedisController({ concurrency })`.

Payloads cross the bus as JSON — BullMQ serializes job data — so a `Date` field arrives as an ISO
**string** even though the proto type says `Date` (`NestAuth.User.createdAt` is the live example).
`@backend/event-bus-nats` behaves identically, where the e2e suite pins it down. Treat a timestamp in an event
payload as a string, and parse it if you need a `Date`.

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
`@backend/event-bus-nats` needs it for the same reason (no DLQ there at all — the log line is the only record).

## Registries

- `globalQueueRegistry` (module singleton, mirrors `globalStreamRegistry`) accumulates
  `event → controller` subscriptions as `@RedisController` runs on class load; the strategy reads it
  at `listen()` to spawn the workers.
- `RedisSubscriptionRegistry` publishes those subscriptions into Redis (`SADD
  event-bus:subs:<eventId> <consumerId>`) so mediators in **other** processes can fan out to them, and
  reads them back with a 5s TTL cache. Entries are durable: they are never removed on shutdown, so
  jobs pile up in a stopped consumer's queue and are delivered on restart (JetStream durable-consumer
  semantics). Retiring a consumer is a manual `SREM` plus queue cleanup.
- `RedisParkingService` holds the events a mediator could not route because nobody was subscribed
  yet. They go into a plain Redis **list** (`event-bus:parked:<eventId>`), not a queue — nothing
  drains it in the background, it is read once, at a subscriber's first bootstrap. `publish()`
  returns the subscriptions whose `SADD` answered 1, and `RedisEventBusServer.listen()` replays
  their parked entries into their own queues with the same `buildFanOutJobId()` the fan-out uses,
  so an event that was both parked and fanned out is still delivered once. The read is
  **non-destructive**: two brand-new consumers of one event need the same entries and there is no
  safe moment to delete them for everyone, so the list is bounded instead — `LTRIM` to
  `REDIS_PARKING_MAX_LENGTH`, `EXPIRE` to `REDIS_PARKING_TTL`. Parking is unconditional, so an
  event with no subscriber at all (`storage.image.delete`) also accumulates a capped list, which
  doubles as the answer to "what is being emitted into nothing".
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
`REDIS_IP_FAMILY` (default `0`), `REDIS_PARKING_MAX_LENGTH` (default `1000`, `0` disables parking
and restores the old drop-on-no-consumers behaviour), `REDIS_PARKING_TTL` (default `86400`),
`REDIS_JOB_ATTEMPTS` (default `10`), `REDIS_JOB_BACKOFF_DELAY` (default `1000`).
The parking bounds mirror the job retention: `count` of `removeOnComplete`, `age` of `removeOnFail`.
The two job knobs exist for the same reason `NATS_MAX_DELIVER` does — the production ladder takes
minutes to walk, so the e2e suite pins a short one.

`REDIS_IP_FAMILY` is the ioredis `family` option — `0` dual stack, `4` IPv4 only, `6` IPv6 only. It
defaults to dual stack because managed private networks are often IPv6-only (Railway's
`*.railway.internal`), where ioredis' default A-record lookup fails with `ENOTFOUND`. Force `6` if
reconnects turn out flaky on such a network.

## Commands & gotchas

```bash
pnpm build            # format:generated → tsdown → dist (cjs + d.ts)
pnpm test             # unit jest; single file: pnpm test -- redis.queue.constants
pnpm test:e2e         # server-backed suite; auto-skips when no Redis answers
pnpm dev / test:watch / lint / format / format:generated / reset
```

- No `compile` here — `src/generated/` is regenerated by `pnpm compile:event-bus`; change events in
  `EventBusStrategy`, never hand-edit `generated/`.
- Specs sit next to their subject (`*.spec.ts` / `*.e2e-spec.ts` under `src/`), are excluded from
  the turbo `build` inputs, and are not part of the tsdown entry graph — but they *are* in the
  tsconfig, so `tsc` and `eslint` type-check them, `layerGuard()` included: an e2e spec that boots a
  controller belongs under `interface/`, whichever layer it is exercising. Target lib is ES2021:
  assign `cause` via `Object.assign`, not `err.cause =`.
- The unit suite covers the mechanism this adapter exists for (`@RedisController` rewriting patterns,
  the mediator's fan-out and parking) plus the pieces a broken one fails silently in: the
  subscription registry's cache and announcements, the server's bootstrap assertions and error
  normalisation, the interceptor's message recovery, and the config's keys and knobs.
- Every worker costs a Redis connection (BullMQ duplicates the shared one for blocking commands):
  mediators for the host's own events plus one per subscription. `RedisTopologyReporter` prints the
  running total at bootstrap — watch it as events grow; the cheaper alternative is fanning out
  directly in the producer instead of via the mediator.
- First-start race: an event emitted before a brand-new consumer has published its subscription
  finds no route, and the mediator **parks** it instead of dropping it (see *Registries*) — the
  consumer replays it the first time it registers, so no manual `SADD` seeding is needed any more.
  Failing the job instead is still **not** an option: events with no subscriber at all
  (`storage.image.delete`) would retry ten times and fill the DLQ. After parking, the mediator
  re-reads the consumer set past the TTL cache — otherwise a consumer that registered between the
  cached read and the park would have replayed too early to see the entry. That costs one extra
  `SMEMBERS` per parked event, in a background worker.
  ```bash
  redis-cli -u "$REDIS_URL" LRANGE event-bus:parked:auth.user.create 0 -1   # what went nowhere
  ```
- Handlers must be idempotent (up to `REDIS_JOB_ATTEMPTS` attempts, plus at-least-once fan-out).
- cjs-only; consumers resolve `dist/`, rebuild after changes.

### The e2e suite

Two specs under `src/interface/servers/` exercise the adapter against a real server. Start one and
run them:

```bash
pnpm docker:local:d      # or: docker run --rm -p 6379:6379 redis:latest
pnpm test:e2e
```

- `redis.transport.e2e-spec.ts` boots a **real Nest microservice** the way `main.ts` does
  (`createNestApplication` → `connectMicroservice(app.get(REDIS_MICROSERVICE_OPTIONS))` →
  `startAllMicroservices`), with three controllers carrying different `consumer` ids on
  `auth.user.create`. That is the only place the mediator's fan-out is visible for what it is, and
  the only coverage of the `failedReason` chain: the failing controller walks its attempts and the
  spec reads the message back out of the `failed` set.
- `redis.parking.e2e-spec.ts` reproduces the first-boot race on `storage.image.delete`: an
  `onlyEmitting` app emits with nobody subscribed, a second app registers for the first time and
  gets the replay, a third restart gets nothing.
- `test/redis-server.setup.js` is a jest `globalSetup`, not a `beforeAll`, for two reasons that both
  come down to timing: `redis.config.ts` validates env at module load, so the overrides have to be
  set before the spec is imported; and the server probe has to land in `process.env` before the
  workers fork, so the spec can pick `describe` vs `describe.skip` synchronously. Without a server
  jest reports the suites as *skipped* rather than passing on an empty run.
- The setup pins `REDIS_QUEUE_PREFIX=bull-e2e` and `REDIS_EVENT_BUS_NAMESPACE=event-bus-e2e`, so the
  suite cannot touch the queues and registries of a local dev run, and `REDIS_JOB_ATTEMPTS=3` with
  `REDIS_JOB_BACKOFF_DELAY=100` so the retry ladder takes milliseconds instead of minutes.
- It probes with a raw socket rather than ioredis: a failed client connection leaves reconnect
  machinery behind that keeps jest from exiting, and the skip path is exactly the one that has to
  stay quiet.
- Each spec wipes only **its own** event's keys in `beforeAll` (`bull-e2e:<eventId>*`,
  `event-bus-e2e:*:<eventId>`) — a blanket wipe of the prefixes would let two files running in
  parallel workers destroy each other's state. Keys are left behind afterwards, so a failed run can
  be inspected.
