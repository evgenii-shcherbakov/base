# CLAUDE.md — frontend.admin

Guidance for working inside `frontend/apps/admin`. Stack basics (Next 15 App Router, Refine 5, MUI 6, `@frontend/proto`) are in the root `CLAUDE.md`. This file is the app-specific map.

## What it is

The admin panel. Refine resources under `src/app/`: `auth/{users,temp-codes}` and `storage/{files,images,videos,storage-objects}`, each with list / show / edit / create (+ `create-many`) pages, plus auth pages (login, register, forgot-password).

## Data access (the core path)

1. Refine's `grpcDataProvider` (`'use client'`, `features/grpc/providers`) delegates every CRUD call to **Next server actions** (`'use server'`, `features/grpc/actions/grpc.data.actions.ts`).
2. Those actions resolve a repository by resource via `grpcDataService.getRepository(resource)` (`features/grpc/services/grpc.data.service.ts`) and call `getById`/`getList`/`createOne`/… on the **`Grpc*AdminRepository`** variant from `@frontend/proto` — the admin panel talks to the api-gateway `Admin` audience.
3. **gRPC runs on the Next server, not in the browser** — `@grpc/grpc-js` is a Node client. Browser → server action → gRPC → api-gateway (`BACKEND_GRPC_URL`). `authService.getAuthMetadata()` injects the JWT into gRPC metadata on every call.

`features/grpc/repositories/index.ts` is the **single source** of `Admin` repository singletons (user, temp-code, file, image, storage-object, video). They are consumed by:

- `features/grpc/services/grpc.data.service.ts` — `GrpcDataService` builds the resource→repository map behind the CRUD data provider from these singletons (no longer instantiates its own).
- the binary-media **route handlers** (`app/api/*`) and the storage create/folder **server actions** (`features/storage/actions/*`), which import the storage repos directly.

The **auth** flow (`features/auth/services/auth.service.ts`) is separate and deliberately uses the `Web`/`Public` audiences (`GrpcUserWebRepository`, `GrpcAuthPublicRepository`): login / refresh / current-user are web-audience calls, not admin CRUD. `getAuthMetadata()` is the single source of gRPC metadata for every call, uploads included — stream uploads used to mint a one-time temp-code first, but the gateway now verifies the access token directly.

## Binary media (separate path)

File/image upload, download, open, and player do **not** go through the data provider. They use Next **route handlers** under `src/app/api/{files,videos}/[id]/...` (multipart via `busboy`, client calls through `internalHttpClient` baseURL `/api`). Chunked upload is sized by `CHUNK_SIZE_MB`; see `features/storage` (`use-single/multiple-file-upload`, uploader, per-type action providers) and `features/video`/`image`.

**Video upload is the exception — it has no route handler.** `createOne`/`createMany` return the entity together with pre-signed Bunny TUS credentials, and `uploadViaTus` (`features/video/helpers`) sends the file from the browser straight to Bunny; nothing passes through the Next server. Both upload hooks take an optional `uploadFileAction` (`features/storage/types`) that swaps the default multipart POST for that path — the same `Action`-suffix trick as `createManyAction`, for Next's 71007 check. `CHUNK_SIZE_MB` is *not* reused there: it sizes the 1 MB gRPC frames of the file path. `VideoActionProvider` flattens the `{ video, upload }` pair so the hooks still see a flat record. **`uploadViaTus` disables tus's fingerprint URL storage on purpose** (`storeFingerprintForResuming: false`, no `findPreviousUploads`): that storage is keyed by the file, not by the `videoId`, so re-uploading the same file resumed the *previous* video's finished upload and left the new row `PENDING` with the UI claiming success. See [ADR-0014](../../../docs/adr/0014-video-uploads-bypass-the-backend.md).

The `file`/`image`/`video` resources are registered in `app/layout.tsx` with `dataProviderName: 'upload'` → a second data provider `grpcUploadDataProvider` (`features/grpc/providers`) whose `create`/`createMany` just echo their variables. Refine's built-in create step is intentionally a no-op for these: the entity row is created and its bytes uploaded by the create pages themselves (create/`create-many`) via the storage server actions + the upload route handlers.

## Forms & fields

- `useValidatedForm(zodShape, props)` (`common/hooks`) wraps Refine's `useForm` with a Zod resolver and also surfaces `providerData` (the loaded record).
- `TypedController` (`common/components/edit-fields/wrappers`) is a thin generic wrapper over RHF `Controller`; the `Controlled*` inputs (`ControlledTextField`, `ControlledSingleSelect`, `ControlledBooleanField`) and the register-based `*EditField` components build on it. `UserSelect` / `FolderSelect` are async-option selects layered on `ControlledSingleSelect`.
- `GridColumnsBuilder` (`common/utils/grid-columns.builder.tsx`) is a fluent builder for MUI `DataGrid` columns (`.string()/.enum()/.date()/.ref()/.actions()…`), memoized per list page with `useMemo`.
- **List pages** (`common/components/pages/resource-list.page.tsx`) intentionally do **manual** URL sync (`syncWithLocation: false` + `router.push`/`useSearchParams`) behind an `isMounted` gate + `enabled: () => isMounted`. Do **not** migrate this to Refine's built-in `syncWithLocation` / a directly-rendered `DataGrid` — that was tried and reverted because Refine then never fires the initial `getList` (infinite loading) and React throws "state update on a component that hasn't mounted yet". See the note at the top of that file.
- **Perf & hooks:** subscribe to specific fields with `watch('field')` / `useWatch` (never the whole-form `watch()`), and read one-off values inside handlers with `getValues()`. Keep hooks at component top level (not inside a `Controller` `render` prop or a conditional) — the shared ESLint preset now enforces `react-hooks/rules-of-hooks` (error) and `react-hooks/exhaustive-deps` (warn).

## Layout (feature-sliced)

- `src/app/` — App Router: resource pages + auth pages + `api/` route handlers.
- `src/common/` — reusable Refine wrappers (`app-create/edit/show`), layouts, entity/edit fields, hooks (`use-validated-form`, `use-resource-show`), `config.service`, grid-columns builder.
- `src/features/` — `grpc` (data access), `auth` (authProvider + JWT cookie), `storage`, `image`, `video`.

## Config & commands

`config.service` validates env through `validateEnv`; that call owns each variable's type and default, and the table in [docs/env.md](../../../docs/env.md) is generated from it — change the schema and run `pnpm compile:env-docs` rather than editing the table. All of it is read on the Next server, so nothing there is a `NEXT_PUBLIC_*`.

```bash
pnpm dev              # refine dev (Refine CLI wrapping Next)
pnpm build / start    # refine build / start
pnpm lint             # next lint
```
