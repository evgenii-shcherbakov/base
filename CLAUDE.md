# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Conversation compaction policy

When compacting the conversation, you MUST preserve:

- **Current working scope**: which service/package is being edited right now, and in which worktree/branch.
- **All proto-contract changes** (`packages/proto`) and the reason for each. Contracts are cross-service — losing them breaks consumers.
- **Added/changed event-bus events** (queues/subjects) and the shape of their payloads.
- **Database schema changes and migrations** (FinTech — critical, never collapse these).
- **The list of changed files with status**: done / in-progress / still needs work.
- **Open failing tests** and any fixes that were found.
- **Architectural decisions made**, with their rationale.
- **Dead-end approaches that did NOT work** (so they are not retried from scratch).

You may compact aggressively:

- Exploration and file reads that led to no changes.
- Full tool output (keep only the conclusion).
- Contents of files that are already applied and committed.
- Intermediate reasoning that does not affect the current state.

## Overview

Personal-website monorepo: a Turborepo + pnpm workspace of NestJS gRPC microservices (backend) and a Next.js/Refine admin panel (frontend), wired together by Protobuf codegen and a Redis/BullMQ event bus. Requires Node ≥22.22, pnpm 11.0.9, and `protoc` (only for proto compilation).

## Workspaces & naming

`pnpm-workspace.yaml` globs four package roots; package names follow a strict convention used everywhere in turbo `--filter` and imports:

- `backend/apps/*` → `backend.<name>` (deployable services: `api-gateway`, `auth`, `storage`)
- `backend/packages/*` → `@backend/<name>` (shared backend libs: `common`, `grpc`, `pg`, `mongo`, `proto`, `event-bus`, `event-bus-nats`, `event-bus-redis`)
- `frontend/apps/*` → `frontend.<name>` (`admin`)
- `frontend/packages/*` → `@frontend/<name>` (`proto`)
- `packages/*` → `@packages/<name>` (cross-stack: `common`, `proto`, `compiler-utils`, `configs`)

Inside an app, TS path aliases are `@/*` (src), `@modules/*`, `@common/*`, and `@compiler/*` (proto package only). Cross-package imports always use the `@backend/…`/`@packages/…` names, never relative paths.

**Dependency versions:** a dependency more than one workspace declares is pinned once, in the `catalog:` block of `pnpm-workspace.yaml`, and each manifest asks for it as `"lodash": "catalog:"`. The workspace still declares what it imports — that is what the tsdown factory and `import-x/no-extraneous-dependencies` read — while the version cannot drift between packages. Bump a shared version in `pnpm-workspace.yaml`, not in a manifest; a dependency only one workspace uses keeps its literal version there. This is not `overrides` (further down the same file): a catalog resolves what a workspace *asks* for, an override rewrites what the whole tree *gets*, transitive dependencies included.

**Build config:** every package that ships a `dist/` builds with tsdown through one shared factory — `nodePackageConfig(import.meta.url)` from `@packages/configs/tsdown/package.config.mjs`. It reads the package's **own** `package.json` to decide what stays external, so an import the package does not declare gets bundled into `dist/` instead of being required at runtime. Declare the dependency; don't hand-extend `neverBundle`.

**Layering invariant:** `@packages/*` are framework-agnostic — imported by **both** backend and the Next frontend, so keep Nest/React out of them. `@backend/*` may depend on Nest. Dependencies flow downward: proto/common → packages → apps.

## Common commands

Run from the repo root (turbo fans out to workspaces; append `--filter=<pkgname>` to scope):

```bash
pnpm dev                      # all backend + frontend in watch mode
pnpm dev:backend.auth         # one service (also .api-gateway, .storage, frontend.admin)
pnpm build                    # build everything (runs ^compile then ^build)
pnpm build:backend.auth       # one service
pnpm test                     # unit suites of every package that has them
pnpm test:e2e                 # e2e suites; each skips itself when its server is unreachable
pnpm lint                     # eslint --fix across workspaces
pnpm format                   # prettier
pnpm docker:local             # postgres + redis only (for local dev against real infra)
pnpm docker:local:d           # the same, detached
pnpm docker                   # full stack in prod mode
pnpm gen:package              # scaffold a new package via turbo generator (packages only; apps are hand-made)
```

**Codegen — rerun after editing a contract, before `build`:**

```bash
pnpm compile:proto            # .proto → @backend/proto, @frontend/proto, @packages/proto
pnpm compile:event-bus        # EventBusStrategy → @backend/event-bus + @backend/event-bus-nats + @backend/event-bus-redis (generated/)
pnpm compile                  # run every package's compile task
```

`compile:proto` needs a `protoc` binary (override with env `PROTOC_PATH`); set `GRPC_COMPILER_CONTEXT=backend|frontend|all` (default `all`) to generate only some targets.

**Database migrations** (run inside a backend service dir, e.g. `backend/apps/auth`):

```bash
pnpm migrate:new              # generate a new MikroORM migration from entity diff
pnpm migrate                  # run pending migrations + data-seeding tasks
pnpm migrate:tasks            # run only the data-seeding tasks (migrator/tasks/)
```

**Tests, lint & strictness:** Jest is configured per package that has tests. Run them repo-wide from the root (`pnpm test`, `pnpm test:e2e`, scoped with `--filter=<pkgname>`) or inside a package (`pnpm test:watch`, single file: `pnpm test -- path/to/file.spec.ts`). Both turbo tasks depend on `^build`, because specs import sibling packages through their built `dist`; `test:e2e` is `cache: false` — whether a suite runs or skips depends on a reachable broker, which turbo cannot hash. The only unit suites so far are `@backend/common`, `@backend/event-bus-redis` and `@backend/event-bus-nats` (`src/**/*.spec.ts`), and the only e2e suites are `@backend/event-bus-redis` and `@backend/event-bus-nats` (`src/**/*.e2e-spec.ts`, auto-skipped when the server is down). The backend apps carry a jest config but still have zero specs, so their `test`/`test:e2e` scripts pass `--passWithNoTests` as a temporary stub to keep the repo-wide run green — drop the flag from a service the moment it gets its first spec. The backend ESLint preset is deliberately loose (off: `no-floating-promises`, `no-unsafe-*`, `no-unused-vars`, `no-explicit-any`), so the linter won't catch those — the one substantive rule it does enforce is `import-x/no-extraneous-dependencies` (a package must declare what it imports; `src/` may not use devDependencies), which the admin's `nextConfig` carries too. Not covered: `@packages/{common,proto,compiler-utils}`, `@backend/proto` and `@frontend/proto` have no ESLint config at all. TypeScript `strict` is **on** for `@packages/*` / `@frontend/*` / admin but **off** for backend apps and `@backend/packages/*`.

## Code navigation (LSP vs grep)

A TypeScript LSP (the `typescript-lsp` plugin) may be available in a session. Two rules specific to this monorepo:

- **LSP within a package, grep across packages.** Cross-package imports (`@backend/*`, `@packages/*`) resolve to the built `dist/*.d.cts`, not source, so `findReferences` / `goToImplementation` on a *source* symbol only cover the same package — they miss consumers in sibling packages (e.g. pg/mongo/auth/storage that consume a `@backend/common` contract). For "who across the repo uses this shared symbol", use grep/Explore; use the LSP for within-package definition / hover / references / diagnostics, where it is precise.
- **Warm up with a repeat query.** tsserver indexes lazily, so the first `findReferences` / `workspaceSymbol` right after the server connects under-reports (can return just the declaration). Run the query a second time for the complete result.

## Protobuf codegen pipeline (the backbone)

`.proto` files in `packages/proto/pkg/` are the single source of truth for all cross-service contracts. The custom compiler in `packages/proto/compiler/` (run by `pnpm compile:proto`) parses them and emits three flavors via separate adapters:

- **Nest adapter** → `backend/packages/proto/src` (`@backend/proto`): typed message namespaces (`NestAuth`, `NestCommon`, `NestStorage`, `NestGoogle`) plus per-service **Transports** (e.g. `GrpcUserTransport`) and controller/client interface types (`GrpcUserServiceController`, `GrpcUserServiceClient`).
- **Client adapter** → `frontend/packages/proto/src` (`@frontend/proto`).
- **Browser adapter** → `packages/proto/src` (`@packages/proto`): browser-safe shared types.

Generated `src/` is committed. Edit the `.proto`, recompile, then `build`. A Transport (`GrpcXTransport`) bundles `.service` (the gRPC service-name string, which also serves as the DI token for `@InjectGrpcService`), `.ControllerMethods()` (class decorator that registers gRPC handlers), and message types — these are how controllers and clients bind to a service.

**Generated exports by target** (each per-service contract comes in audience variants — base / `Admin` / `Web` / `Public`):
- `@backend/proto` → `Nest*` namespaces + `Grpc<X>Transport` / `Grpc<X>ServiceController` / `Grpc<X>ServiceClient`.
- `@frontend/proto` → `Client*` namespaces + `Grpc<X>Repository`. The admin frontend should call the **`Admin`** repositories.

At runtime the gRPC loader reads the original `.proto` from `node_modules/@packages/proto/pkg`, so `pkg/` is a runtime dependency of the services, not just a codegen input. Both codegen compilers (proto and event-bus) share primitives from `@packages/compiler-utils` (Pug templating + ts-morph import handling).

## Event-bus codegen pipeline (NATS / Redis events)

A second custom compiler, parallel to the proto one, generates the typed event bus. The single source of truth is the **`EventBusStrategy` interface** in `backend/packages/event-bus/src/strategy/index.ts`, shaped `[host][service][event]: PayloadType` (e.g. `auth.user.create: NestAuth.User`). Payloads are usually proto types; custom non-proto payloads live in `src/strategy/events/` (e.g. `StorageObjectParentUpdateEvent`).

Codegen is **one task per target package** (all three run by `pnpm compile:event-bus`, which filters `@backend/event-bus*`). Each parses the strategy with **ts-morph** (not protobufjs) in its own process and writes only its own `src/generated/`, so every turbo task declares the output it actually produces — turbo cannot declare outputs outside a package, and a cross-package write would leave the neighbours' files in no cache archive. Ordering falls out of the existing graph: `@backend/event-bus` compiles and builds, then the adapters compile against its `dist/compiler.cjs`.

- **Abstract buses** (`@backend/event-bus/compiler/`) → `@backend/event-bus/src/generated/index.ts`: a base `EventBus`, one abstract `<Service>EventBus` per service with `emit<Event>(event)` + `emitMany<Event>(events)`, and the `EventBusHost` enum. This package also publishes the build-time API the adapters compile against — `EventBusAdapter`, `parseStrategy()`, the parsed `ServiceModel` — as the separate entrypoint `@backend/event-bus/compiler`. Those names are kept deliberately distinct from the proto compiler's private `BaseAdapter`/`ContextService`/`CompilerContext` and from the runtime `<Service>EventBus` classes.
- **Transport adapters** (pug-templated, each in its own package's `compiler/`) → `@backend/event-bus-nats/src/generated/index.ts` and `@backend/event-bus-redis/src/generated/index.ts`: per-service `<Adapter><Service>Transport` (event-pattern constants, a `.ControllerMethods()` class decorator, and `.EventBus` = the abstract class), subscriber interfaces `<Adapter><Service>EventController`, cross-host handler interfaces `<Adapter><Service><Event>EventHandler` (method `on<Service><Event>`), and a `<Adapter>ClientFactory` (maps each abstract bus → its concrete impl: `NatsJetStreamClient`-backed for NATS, `RedisQueueClient`-backed for Redis). Each adapter also emits a host-scoped map for the host-owned side of its runtime: `REDIS_HOST_EVENTS` (host → event ids) for the Redis mediator, `NATS_HOST_STREAMS` (host → streams it owns) for the NATS stream provisioner.

**Naming is service-scoped, not host-scoped**: generated class/interface names (`<Service>EventBus`, `Nats<Service>Transport`, `Nats<Service>EventController`, …) are derived from the service name alone — the host is dropped. This means service names must stay unique **across all hosts** in `EventBusStrategy`, or the compiler emits colliding class names.

Subjects are kebab-cased `host-service-event` (`auth-user-create`); JetStream streams stay host-scoped too — `host-service-stream` (`auth-user-stream`) — even though the generated class/interface names (bus, transport, controller) dropped the host prefix (see naming note above). Every target package's `src/generated/` is committed — edit the strategy, `pnpm compile:event-bus`, then `build`. Adding a transport means a **new package** carrying its own `compiler/` (adapter class + pug templates) plus a `compile` script and turbo task; `@backend/event-bus` is not edited.

**Runtime wiring (Redis/BullMQ — the live transport):**
- **Emit**: a feature module imports `RedisModule.forFeature({ EventBus: Redis<X>Transport.EventBus })`, binding the abstract bus to its concrete client; use-cases inject the abstract `<X>EventBus` and call `emit<Event>` after a successful write.
- **Subscribe**: a controller under `interface/redis/*.controller.ts`, decorated `@RedisController({ consumer: '<host>.<module>' })` + `Redis<X>Transport.ControllerMethods()`, implements `Redis<X>EventController`. To consume an event owned by **another** host, implement that `Redis…EventHandler` interface and decorate the method with `@RedisEvent(Redis<Other>Transport.<CONSTANT>)` (see `RedisStorageObjectController` consuming `auth.user.create`). `@RedisController` must sit **above** `ControllerMethods()` — it rewrites the class's patterns into `<eventId>@<consumerId>` queue names.
- **Queues**: BullMQ is a work queue, so fan-out is explicit. An event queue (`auth.user.create` — the dot-cased event id used verbatim) is drained by a mediator that copies each job into one queue per subscriber (`auth.user.create@storage.file`; `@` because BullMQ forbids `:` in queue names). Subscribers are discovered through a Redis-backed registry (`SADD event-bus:subs:<eventId>`) that every service publishes at bootstrap.
- **Delivery**: at-least-once via BullMQ retries (`attempts: 10`, exponential backoff, the `failed` set as DLQ, `concurrency` 1) instead of ack/nak — subscriber handlers must be idempotent.
- **Bootstrap**: `RedisModule.forRoot({ host: EventBusHost.X })` in `app.module.ts` + `app.connectMicroservice(app.get(REDIS_MICROSERVICE_OPTIONS))` in `main.ts`.

**`@backend/event-bus-nats` is the dormant alternative.** It is fully generated, unit-tested and functional, but no service imports it since `auth`/`storage` moved to Redis. It mirrors the Redis adapter — `@NatsController({ consumer: '<host>.<module>' })` rewrites patterns into `<subject>@<consumerId>` so two controllers of one host can subscribe to the same event, `globalConsumerRegistry`/`globalStreamRegistry` feed the `NatsEventBusServer` strategy, `NATS_HOST_STREAMS` feeds the stream provisioner — with one deliberate difference: there is **no mediator**. JetStream delivers a copy to every durable consumer of a subject, so the consumer id goes into the durable name (`storage-file-auth-user-create`) instead of into a re-published queue, and the distributed subscription registry has no counterpart. It sits directly on the nats.js v3 client — `@nats-io/transport-node` + `@nats-io/jetstream` + `@nats-io/nats-core`, replacing the deprecated monolithic `nats` package (kebab-cased subjects `auth-user-create`, explicit ack, `max_deliver` 10, `max_ack_pending` 1). The event bus is deliberately broker-agnostic — swapping back is a matter of module/controller imports. See each package's CLAUDE.md.

## Backend service architecture (hexagonal / use-case)

This is a **clean-architecture redesign** (branch `feat/use-case-architecture`). **`backend/apps/auth` is the reference implementation** — match its structure for new code. Each service `src/modules/<feature>/` has four layers:

```
domain/          # abstract contracts: repositories/*.repository.ts, services/*.service.ts,
                 #   interfaces, entities — depend on nothing concrete
application/     # use-cases/*.use-case.ts (one class, one execute()), DTOs
infrastructure/  # concrete impls: pg/repositories/*.repository.impl.ts, pg/entities,
                 #   pg/mappers, services/*.service.impl.ts, configs
interface/       # adapters in: grpc/*.controller.ts, cron/*.scheduler.ts (+ web/rpc in gateway)
```

Key conventions, all visible in the auth module:

- **DI binds abstract → impl**: the module lists `{ provide: UserRepository, useClass: PgUserRepositoryImpl }`. Use-cases and controllers depend on the abstract class (`domain/`), never the impl. The data-layer **contracts** (`DatabaseRepository`, `MigrationService`, `DatabaseRunnerService`, and base CRUD use-cases `GetUseCase` / `CreateUseCase` / …) live in `@backend/common`; concrete impls live in `@backend/pg` (**active**) and `@backend/mongo` (**dormant — unused; resolves the README's "Mongoose + MikroORM" ambiguity**). Service repositories extend `DatabaseRepository<...>` and service CRUD use-cases extend the abstract bases.
- **Proto types are domain-safe unless `Grpc`-prefixed.** Every `@backend/proto` export *without* a `Grpc` prefix — the `Nest*` message namespaces (`NestAuth`, `NestCommon`, `NestStorage`, `NestGoogle`) — is a pure data contract and may be imported from **any** layer, `domain/` included. The `Nest` prefix names the generated adapter, not a framework dependency: these are plain TS types with no Nest/RxJS/DI at runtime (domain repositories already extend `NestCommon.Entity`). Only the `Grpc*` exports (`Grpc<X>Transport`, `Grpc<X>ServiceController`, `Grpc<X>ServiceClient`) carry Nest decorators, RxJS `Observable`s and DI tokens — those are framework-bound and stay in `interface/` / `infrastructure/`. Rule of thumb: `Nest*` = domain-safe, `Grpc*` = framework-only.
- **Errors flow as `Either` monads** (`@sweet-monads/either`), not thrown. Use-cases return `Promise<Either<Error, T>>`; controllers unwrap with `GrpcRxPipe` (`.unwrapEither`, `.toArrayItems`) from `@backend/grpc`.
- **gRPC controllers** are thin: implement the generated `Grpc<X>ServiceController`, decorate with `@GrpcController()` + `Grpc<X>Transport.ControllerMethods()`, and delegate each method to a use-case via `from(useCase.execute(...)).pipe(GrpcRxPipe.…)`.
- **Domain events** are emitted via injected abstract `@backend/event-bus` buses (e.g. `UserEventBus.emitCreate`) after a successful write, and consumed by `interface/redis/*.controller.ts` subscribers — see *Event-bus codegen pipeline* above.
- **Bootstrap** (`main.ts`) is uniform: create the Nest app, then `connectMicroservice` for both `GRPC_MICROSERVICE_OPTIONS` (`@backend/grpc`) and `REDIS_MICROSERVICE_OPTIONS` (`@backend/event-bus-redis`). `app.module.ts` wires `GrpcModule.forRoot({ host })`, `RedisModule.forRoot({ host })`, `PgModule.forRoot({ database })`, and `ConfigModule` loading `config.ts`.
- **Config** (`config.ts`) spreads `commonConfig()` from `@backend/common` and validates service-specific env with `validateEnv(zod schema)` from `@packages/common`.
- **Data layer**: entity IDs are application-generated monotonic **ULIDs** (`pgId`), not DB sequences/UUIDs (so `id` is a sortable string); table/database names come from `@packages/common` `database/enums`; every gRPC handler runs inside a per-request MikroORM `RequestContext` (transactional isolation via `PgRequestInterceptor`).
- **gRPC topology**: the host → URL → services map is centralized in `@backend/grpc` `grpcConfig` (driven by `*_GRPC_URL` env vars). Adding a service or host means editing it **and** the env var.
- **Layer direction is lint-enforced**: `auth` and `storage` (plus `@backend/pg`/`mongo`/`nats`/`redis`) wire a shared `layerGuard()` flat-config helper (`@packages/configs/eslint/layer-guard.mjs`) alongside `nestConfig` in their `eslint.config.mjs`. It forbids outward-to-inward imports (`domain` can't import `application`/`infrastructure`/`interface`, etc.) by path segment, regardless of nesting depth; `*.module.ts`/`main.ts` composition roots are exempt.

### Migrations & the migrator sub-app

Backend services with a DB are NestJS **monorepo projects** (`nest-cli.json` defines `service` + `migrator` apps). `src/migrator/` is a standalone `nest-commander` entrypoint: `migrations/` holds MikroORM SQL migrations (+ `.snapshot-*.json`), and `tasks/` holds idempotent data-seeding tasks (`implements MigrationTask` with an `up()`, e.g. `create-admin.task.ts`). Production startup runs `node dist/migrator/main -- postgres-migration && node dist/main`.

A data task may call **other services over gRPC** by declaring `appClientStrategy` in the migrator module (e.g. storage's `create-root-folders` backfills via the auth `GrpcUserService`). A fresh deployment seeds its first admin via the `create-admin` task from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## api-gateway

The edge service: it serves REST + Swagger **and** runs as a gRPC server (`GrpcModule.forRoot({ host: 'apiGateway' })` — the admin frontend calls it over gRPC), terminating external requests and **proxying to internal gRPC services**. Controllers are split by audience under `modules/<feature>/interface/grpc/` (`*.web.controller.ts`, `*.admin.controller.ts`, `*.public.controller.ts`); each delegates to an `application/services/*.proxy.service.ts` that injects a generated gRPC client via `@InjectGrpcService(GrpcXTransport.service)` and calls `firstValueFrom(client.method(req).pipe(GrpcRxPipe.rpcException))`. Authorization is a global `CommonModule` exposing `AccessService` plus per-controller access decorators (`@PublicGrpcController()` / `@DefaultGrpcController()` / `@AdminGrpcController()`) and unary/stream guards over gRPC metadata.

> **Note:** Its feature modules are **two-layer** (`modules/<feature>/{interface,application}` only — no `domain`/`infrastructure`, since the gateway has no persistence); cross-cutting auth lives in `src/common/`. This differs from the four-layer `auth`/`storage` services on purpose — don't add domain/infra layers here.

## Frontend admin

Next.js 15 (App Router) + Refine 5 + MUI 6, run with the `refine` CLI. It consumes `@frontend/proto`/`@packages/proto` gRPC clients to talk to api-gateway. Refine data/auth providers live in `src/common/providers`; shared UI/hooks/helpers under `src/common`.

gRPC calls run on the **Next server** (server actions + `app/api` route handlers), never from the browser — `@grpc/grpc-js` is a Node client. The path is: browser → Next server action → gRPC → api-gateway.
