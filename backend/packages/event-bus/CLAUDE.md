# CLAUDE.md — @backend/event-bus

Guidance for working inside `backend/packages/event-bus`. The full event-bus codegen flow and runtime wiring (emit/subscribe, `NatsModule`) are documented in the root `CLAUDE.md` *Event-bus codegen pipeline* section — read it first. This file is the package internals.

## Dual nature

This package is **both** the event-bus source of truth + compiler **and** one of the compiler's outputs. Like `packages/proto`, you hand-edit one part (`strategy/`) and the rest (`generated/`) is emitted. Unlike `packages/proto`, it emits **only its own** `generated/`: each adapter package compiles itself, against the build-time API this one publishes as `@backend/event-bus/compiler`.

## Layer map (hexagon)

This package owns the **domain + ports** side of the event-bus hexagon; the
concrete adapters live in `@backend/event-bus-redis` (live) and `@backend/event-bus-nats` (dormant —
generated and buildable, but wired into no service):

- **strategy/** — domain: the `EventBusStrategy` contract + custom (non-proto)
  event payloads in `strategy/events/`. `EventBusStrategy` itself is compiler
  input (not exported at runtime); only `strategy/events` is re-exported.
- **generated/** — ports: abstract `<Service>EventBus` classes
  (`emit<Event>`/`emitMany<Event>`) + the `EventBusHost` enum. Use-cases depend
  on these abstractions; the adapter packages provide the impls. Never hand-edit.
- **compiler/** — build-time codegen (ts-morph + pug), **not** a runtime layer.
  Exported separately (`@backend/event-bus/compiler`) for the adapter packages.

Two public entrypoints: the runtime barrel `src/index.ts` (`./generated` +
`./strategy/events`) at `.`, and `compiler/index.ts` at `./compiler`. Runtime
consumers only ever reach `.`, so ts-morph and pug stay out of their graph.

## Source of truth — `src/strategy/`

`strategy/index.ts` exports the `EventBusStrategy` interface, shaped `[host][service][event]: PayloadType` (e.g. `auth.user.create: NestAuth.User`). To add an event, add a key here. Payloads are usually `@backend/proto` types; custom (non-proto) payloads go in `strategy/events/` (e.g. `StorageObjectParentUpdateEvent`) and are re-exported.

## Compiler — `compiler/` (`pnpm compile`)

`createCompilerContext()` parses `EventBusStrategy` with **ts-morph** (`ContextService` + `ParseStrategyService`) and returns the `ServiceEventBus[]` model every emitter works from. `main.ts` then hands it to `EventBusService`, which writes abstract `<Service>EventBus` classes (`emit<Event>` / `emitMany<Event>`) + the `EventBusHost` enum into **this package's** `src/generated/index.ts`. That is all this package emits.

The transports are emitted **by the adapter packages themselves**, each in its own turbo `compile` task with its own `compiler/main.ts`, adapter class and pug templates. They import `BaseAdapter` and `createCompilerContext` from `@backend/event-bus/compiler` and write to a path local to themselves, so every task declares the output it actually produces — a cross-package write could not be declared, and the cache would restore an incomplete tree.

Each task is a separate process, so the strategy is parsed once per task rather than handed between them (~0.5 s each). That keeps `pnpm compile` inside any single package self-contained.

Adding an adapter means a **new package** with a `compiler/` of its own plus the `compile` script and turbo task — no edit here. `BaseAdapter.onInit` creates its output file, so the target package does not need a committed `generated/` stub. Event ids are exposed raw (`method.eventId`, dot-cased `auth.user.create`) — each adapter decides how to shape them: Nats kebab-cases them into subjects, Redis uses them verbatim as queue names.

Both adapters emit a third, host-keyed map alongside the transports and the client factory, for the part of their runtime that is owned by a host rather than by a subscriber: `REDIS_HOST_EVENTS` (host → event ids, read by the mediator) and `NATS_HOST_STREAMS` (host → the streams it owns, read by the stream provisioner). Both come from a `getHosts()` helper on the adapter and a `<name>.registry` template, now living in their own packages.

Naming: `serviceId = dot-case(service)` — **host is dropped from class/interface names**, so generated bus/transport/controller names are `<Service>EventBus` / `Nats<Service>Transport` / etc., not `<Host><Service>…`. This means service names must be unique across all hosts in `EventBusStrategy`, or the compiler emits colliding class names. Subjects (`eventId = dot-case(host_service_event)` → kebab `host-service-event`, e.g. `auth-user-create`) and JetStream stream names (`host-service-stream`, e.g. `auth-user-stream`) both stay host-scoped — only the generated class/interface names dropped the host.

## Exports — `src/index.ts`

Re-exports `./generated` (the abstract buses + `EventBusHost`) and `./strategy/events` (custom payload types). Runtime deps are minimal: only `@backend/proto` + `reflect-metadata` (ts-morph/pug/compiler-utils are dev-only compiler tooling).

## Exports — `compiler/index.ts`

The build-time API the adapter packages compile against: `BaseAdapter` (+ its factory types), `createCompilerContext`, `ContextService`, `ParseStrategyService`, `ServiceEventBus` / `EventBusMethod`, and `EVENT_BUS_IMPORT_SPECIFIER`.

Two things this entry constrains:
- **Paths must be repo-anchored, not `__dirname`-relative.** `compiler/constants` derives them from `BACKEND_PACKAGES_DIR_ROOT` (`@packages/compiler-utils`) because this module is bundled into `dist/compiler.cjs` and read from the adapter packages — a path relative to the emitting file would resolve against `dist/` there.
- **`tsdown.config.mts` spreads this package's own deps into `neverBundle`**, on top of the root ones every other package uses. ts-morph and pug are declared only here; without them listed, tsdown inlines both and `dist/compiler.cjs` grows from ~11 kB to ~13 MB.

## Commands

```bash
pnpm compile          # tsx compiler/main.ts → regenerates THIS package's src/generated, prettier-formatted as it writes
pnpm build            # tsdown: src + compiler → dist/index.cjs + dist/compiler.cjs (cjs + d.ts)
pnpm dev              # tsdown --watch (build only — does NOT recompile)
pnpm lint / format / format:generated / reset
```

Turbo splits stages: `compile` (inputs `src/strategy/**`,`compiler/**` → outputs `src/generated/**`) vs `build` (→ `dist/**`). `compiler/**` is an input of **both** — the compiler entry ships in `dist`.

From root, `pnpm compile:event-bus` filters `@backend/event-bus*`, which matches this package and the two adapters. Ordering falls out of the existing graph (root `compile.dependsOn: ["^compile", "^build"]`): this package compiles, builds, and only then do the adapters compile against `dist/compiler.cjs`.

## Gotchas

- A strategy edit invalidates all three `compile` tasks (via the dependency hash), but each writes only its own file. Never hand-edit any `generated/`.
- An adapter's templates live in **its** package. Editing `event-bus-redis/compiler/templates/*` no longer invalidates the NATS adapter.
- Fix generated-output bugs in the strategy, the compiler services, or the adapter templates — not the emitted `.ts`.
- Both writes (`BaseAdapter.run`, `EventBusService.compile`) go through `FormatService` from `@packages/compiler-utils`, so the emitted files are prettier-formatted before they reach disk and the turbo cache. A plain `sourceFile.save()` would reintroduce raw output on cache hits.
- cjs-only output; consumers resolve `dist/`, so rebuild after changes (turbo `^build` handles downstream).
