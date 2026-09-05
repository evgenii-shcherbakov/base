# CLAUDE.md — @backend/event-bus-nats

Guidance for working inside `backend/packages/event-bus-nats`. The event-bus codegen flow and the abstract
ports are in the root `CLAUDE.md` *Event-bus codegen pipeline* section — read it first. This file
is the package internals: the NATS JetStream runtime.

**Status: dormant.** `auth`/`storage` run on `@backend/event-bus-redis`, so no service imports this package
and `docker-compose.yml` starts no `nats` container. It stays generated, built and unit-tested as
the alternative broker — keep it working when changing the event bus.

## Dual nature

`src/generated/index.ts` is **emitted by this package's own compiler** (`compiler/`, run as its own
turbo `compile` task) — transports (`Nats<Service>Transport`, service-scoped naming, host dropped),
subscriber/handler interfaces, `NatsClientFactory` and `NATS_HOST_STREAMS`. Everything else
(`infrastructure/`, `interface/`, `nats.module.ts`) is hand-written runtime.

## Compiler — `compiler/`

```
compiler/
  main.ts           # builds the context, runs the adapter, writes ../src/generated/index.ts
  nats.adapter.ts   # BaseAdapter subclass: imports, per-service transports, client, registry
  templates/*.pug   # nats.controller / nats.client / nats.registry
```

`main.ts` gets `BaseAdapter` and `createCompilerContext()` from `@backend/event-bus/compiler` — the
build-time entrypoint of the ports package — and parses `EventBusStrategy` itself. Nothing is handed
over from the ports package's own compile: each turbo task is a separate process, so the ~0.5 s parse
is repeated here in exchange for `pnpm compile` inside this package working on its own.

`outputPath` is local (`join(__dirname, '..', 'src', 'generated', 'index.ts')`), which is the point:
the task declares the output it actually writes, so a cache hit restores a complete tree. Turbo
cannot declare outputs outside a package, so the earlier arrangement — one compile in the ports
package writing into all three — left this file in no cache archive at all.

Mirrors `@backend/event-bus-redis/compiler/` structurally; the difference is in the templates, which
kebab-case `eventId` into subjects instead of using it verbatim as a queue name.

## Consumer-scoped subscriptions

The adapter is shaped like `@backend/event-bus-redis`: a controller declares its system-wide id once, and
every subscription is scoped by it.

```ts
@NatsController({ consumer: 'storage.file' })
@NatsStorageObjectTransport.ControllerMethods()
export class NatsStorageObjectController
  implements NatsStorageObjectEventController, NatsUserCreateEventHandler
{
  async onParentUpdate(event: StorageObjectParentUpdateEvent): Promise<void> {}

  @NatsEvent(NatsUserTransport.CREATE)
  async onUserCreate(@Payload() event: NestAuth.User, @Ctx() context: NatsMessageContext) {}
}
```

- `consumer` is the controller's system-wide id (`<host>.<module>`). Declared once, in
  `@NatsController`.
- **Decorator order matters.** Method decorators run before class decorators, so
  `ControllerMethods()` and `@NatsEvent` can only store the bare subject; `@NatsController` runs
  last (class decorators apply bottom-up) and rewrites `PATTERN_METADATA` into
  `<subject>@<consumerId>`. Keep `@NatsController` **above** the transport decorator. A pattern
  that reaches the strategy without the suffix fails bootstrap with an explicit message.
- The `@` suffix is a **process-local Nest map key only** — unlike Redis, where the same string
  names a real BullMQ queue. `NatsEventBusServer` strips it before touching NATS: the subject
  stays `auth-user-create`, and the consumer id goes into the durable name instead
  (`storage-file-auth-user-create`, see `buildDurableName`).
- `context?: NatsMessageContext` is only injected when decorated with `@Ctx()` (and then the
  payload needs `@Payload()`) — standard Nest behaviour.

### Why this exists

Without it, two controllers of the same host on one subject collapse: Nest keys `messageHandlers`
by pattern, so the second registration replaces the first, and both would sit behind one durable
that load-balances instead of fanning out. That was the behaviour of the old
`@nestjs-plugins/nestjs-nats-jetstream-transport` wiring, which derived a single durable per
(host, subject) from one `consumerOptions` object per host.

### Why there is no mediator

`@backend/event-bus-redis` needs `RedisMediatorService` + `RedisSubscriptionRegistry` because BullMQ is a
work queue: a job goes to exactly one worker, so fan-out has to be re-published by hand. JetStream
delivers a copy to **every** durable consumer of a subject, so the fan-out stage and the
distributed subscriber registry have no counterpart here — one durable per (subject, consumerId)
is the whole mechanism. The slot the mediator occupies in `RedisModule.forRoot` (a host-owned
provider that runs even in `onlyEmitting` mode) is taken by `NatsStreamProvisionerService`.

## Why the wrapper library is gone

`@nestjs-plugins/nestjs-nats-jetstream-transport` takes the Nest pattern as the subject and builds
one consumer config per host, so it cannot express a per-controller durable. The package now sits
directly on the nats.js client and owns its connection, client and server, mirroring the
connection → client → server layout of `@backend/event-bus-redis`.

## The client — nats.js v3

nats.js v3 split the monolithic `nats` package (deprecated) into scoped ones, so three are declared
instead of one:

- **`@nats-io/transport-node`** — `connect()` and `NodeConnectionOptions` (what `connect` actually
  takes; it narrows `tls` to the Node shape, so `natsConfig.getConnectionOptions` returns it rather
  than the core `ConnectionOptions`).
- **`@nats-io/jetstream`** — everything JetStream: the `jetstream(nc)` / `jetstreamManager(nc)`
  functions, `JsMsg`, `ConsumerMessages`, `PubAck`, the config types and the policy enums.
- **`@nats-io/nats-core`** — `nanos()`, `NatsConnection`, `WithRequired`. Declared explicitly even
  though `@nats-io/transport-node` re-exports it, because that re-export goes through the
  `@nats-io/nats-core/internal` subpath.

Two v3 changes shaped the code:

- **`NatsConnection#jetstream()` / `#jetstreamManager()` are gone** — `NatsConnectionService` builds
  both through the module-level functions instead and memoizes them (creating the manager
  round-trips to the server, and the strategy asks for one per subscription).
- **`JSONCodec` is gone** — `NatsJetStreamClient.emit` publishes `JSON.stringify(event)` (a
  `Payload` may be a string, which the client encodes as UTF-8 itself, so the wire bytes are
  unchanged) and the server decodes with `msg.json()`, which throws on a malformed payload exactly
  where the codec used to, and the catch turns that into a nak.

`jsm.streams.add()` also tightened its signature to require `name`, which is why
`getStreamConfig` returns `WithRequired<Partial<StreamConfig>, 'name'>`.

## Layer map (hexagon)

Concrete adapter for the abstract ports of `@backend/event-bus`:

- **infrastructure/** — driven/outbound: `configs/` (connection, stream and consumer options),
  `constants/` (DI tokens, pattern/durable helpers), `types/` (`NatsStreamData`,
  `NatsConsumerSubscription`), `utils/` (`globalStreamRegistry`, `globalConsumerRegistry`),
  `connections/` (the shared `NatsConnection`), `clients/` (`NatsJetStreamClient` — the publisher),
  `provisioners/` (`NatsStreamProvisionerService` — declares the host's streams).
- **interface/** — driving/inbound: `decorators/` (`@NatsController`, `@NatsEvent`), `contexts/`
  (`NatsMessageContext`), `interceptors/` (ack/nak), `servers/` (`NatsEventBusServer`, the
  `CustomTransportStrategy` that runs the durable consumers).
- **nats.module.ts** — composition root: `forRoot` (connection + client + stream provisioner, and
  the server strategy unless `onlyEmitting`), `forFeature` (bind abstract bus → concrete client).
- **generated/** — one codegen file spanning both layers; never hand-edit.

Public API is the flat root `src/index.ts` barrel. Inside the package `@/*` aliases `src/*`.

## Module (`nats.module.ts`)

- `NatsModule.forRoot({ host: EventBusHost, onlyEmitting? })` — global. Always provides the shared
  connection, `NatsJetStreamClient` and the **stream provisioner**: a host must declare the streams
  of the events it owns even when it only emits, otherwise it publishes into a stream that does not
  exist. Unless `onlyEmitting`, it also provides `NATS_MICROSERVICE_OPTIONS`, connected in `main.ts`
  via `app.connectMicroservice(app.get(NATS_MICROSERVICE_OPTIONS))`.
- `NatsModule.forFeature({ EventBus })` — binds an abstract bus to its concrete client via
  `NatsClientFactory`, exactly like `RedisModule.forFeature`.
- The connection provider is registered **last** on purpose: Nest runs shutdown hooks in provider
  order, so the socket is drained after the consumers are stopped.

## Streams & registries

- Stream names stay host-scoped: `<host>-<service>-stream` (`auth-user-stream`), subjects are the
  kebab-cased event ids (`auth-user-create`) — only the generated class names dropped the host.
- `globalStreamRegistry` accumulates `stream → subjects` as `ControllerMethods()` / `@NatsEvent`
  run on class load; the server strategy reads it to declare the streams it **consumes** (their
  owner may not have started yet) and to resolve a subject to its stream.
- `globalConsumerRegistry` accumulates `NatsConsumerSubscription` entries as `@NatsController` runs;
  the strategy reads it at `listen()` to create one durable per entry. Mirrors `globalQueueRegistry`.
- `NATS_HOST_STREAMS` (generated) maps host → the streams it **owns**; `forRoot` feeds the host's
  entry to the provisioner. Mirrors `REDIS_HOST_EVENTS`.
- Stream declaration is idempotent: an existing stream only gets its `subjects` updated, so manual
  operator tuning of retention/storage survives a redeploy. Durables are created only when absent.

## Delivery semantics

One durable per (subject, consumerId): `ack_policy` explicit, `ack_wait` 30s, `max_deliver` 10,
`max_ack_pending` 1. Delivery is **at-least-once with redelivery** — handlers must be idempotent.
`NatsControllerInterceptor` acks on success and naks on failure; `NatsEventBusServer` naks whatever
throws outside the interceptor's observable (a decode failure, say). After `max_deliver` the server
stops redelivering and emits a `$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES` advisory — there is no
DLQ set to inspect the way BullMQ's `failed` set is, so failures have to be caught in the logs.

Because the log line is the only record, both of those places resolve the message through
`resolveErrorMessage()` from `@backend/common` (fallback `NATS_ERROR_FALLBACK`): a wrapper error
carries none of its own — a MikroORM `DriverException` over the `AggregateError` Node raises for a
refused connection would otherwise log nothing readable.

The two must not both answer for the same failure, which is what `NatsMessageContext.isAnswered()`
is for. An error the interceptor already handled still surfaces in the server's `catch`, but by then
Nest's `RpcExceptionsHandler` has replaced it with a bare `Internal server error` — logging that
would bury the interceptor's accurate line under a useless one, and nak an already-naked message.
So the server bails out on an answered context and only reports what nothing else saw.

Payloads cross the bus as JSON (`JSON.stringify` on the way out, `msg.json()` on the way in), so a
`Date` field arrives as an ISO **string** even though the proto type says `Date` —
`NestAuth.User.createdAt` is the live example. This is a property of the bus, not of NATS: BullMQ
serializes job data the same way in `@backend/event-bus-redis`. Treat a timestamp in an event payload as a
string, and parse it if you need a `Date`.

`max_ack_pending` — not any client-side buffer — is what bounds in-flight messages: the server
withholds the next one until the current is acked. It is the equivalent of the Redis worker
`concurrency`, overridable globally with `NATS_CONSUMER_CONCURRENCY` or per controller with
`@NatsController({ concurrency })`.

### Difference from the Redis adapter

`deliver_policy` defaults to `all`, so a subscriber added later replays the stream from the
beginning the first time its durable is created. The Redis mediator instead **drops** an event
nobody was registered for yet. Set `NATS_DELIVER_POLICY=new` for the Redis behaviour.

## Env

`NATS_URL` (default `nats://localhost:4222`), `NATS_ACK_WAIT_MS` (30000), `NATS_MAX_DELIVER` (10),
`NATS_CONSUMER_CONCURRENCY` (1), `NATS_DELIVER_POLICY` (`all` | `new`, default `all`).

## Commands & gotchas

```bash
pnpm build            # format:generated → tsdown → dist (cjs + d.ts)
pnpm test             # unit jest; single file: pnpm test -- nats.consumer.constants
pnpm test:e2e         # broker-backed suite; auto-skips when no broker answers
pnpm dev / test:watch / lint / format / format:generated / reset
```

- No `compile` here — `src/generated/` is regenerated by `pnpm compile:event-bus`; change events in
  `EventBusStrategy`, never hand-edit `generated/`.
- Specs sit next to their subject (`*.spec.ts` / `*.e2e-spec.ts` under `src/`), are excluded from the
  turbo `build` inputs, and are not part of the tsdown entry graph — but they *are* in the tsconfig,
  so `tsc` and `eslint` type-check them.
- The unit suite covers the mechanism this adapter exists for: `@NatsController` rewriting patterns
  and two controllers on one subject ending up with two distinct durables.

### The e2e suite

`src/interface/servers/nats.transport.e2e-spec.ts` is the only place the adapter is exercised against
a real broker, since no service wires this package. Start one and run it:

```bash
docker run --rm -p 4222:4222 nats:latest -js
pnpm test:e2e
```

- It boots a **real Nest microservice** the way `main.ts` does (`createNestApplication` →
  `connectMicroservice(app.get(NATS_MICROSERVICE_OPTIONS))` → `startAllMicroservices`), with three
  controllers carrying different `consumer` ids on `auth.user.create`. That is what makes it the only
  coverage `NatsControllerInterceptor` has: the handlers never ack, so a green run proves the
  interceptor acked, and the redelivery ladder proves it naked.
- `test/nats-broker.setup.js` is a jest `globalSetup`, not a `beforeAll`, for two reasons that both
  come down to timing: `nats.config.ts` validates env at module load, so `NATS_MAX_DELIVER=3` has to
  be set before the spec is imported; and the broker probe has to land in `process.env` before the
  workers fork, so the spec can pick `describe` vs `describe.skip` synchronously. Without a broker
  jest reports the suite as *skipped* rather than passing on an empty run.
- It wipes `auth-user-stream` in `beforeAll` (`deliver_policy: all` would otherwise replay the
  previous run's history) and leaves it behind afterwards, so a failure can be inspected in the
  broker. Reruns stay deterministic either way.
- Handlers must be idempotent (redelivery up to 10×).
- cjs-only; consumers resolve `dist/`, rebuild after changes.
