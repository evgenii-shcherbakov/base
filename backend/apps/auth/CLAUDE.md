# CLAUDE.md — backend.auth

Guidance for working inside `backend/apps/auth`. The 4-layer hexagonal/use-case architecture, the `Either` pattern, gRPC controllers, and the migrator sub-app are described in the root `CLAUDE.md` — and **this service is the reference implementation it points to**, so keep it clean and idiomatic. This file is the service-specific map.

## What this service is

The identity / authentication microservice. gRPC host `auth`, event-bus host `EventBusHost.AUTH`, database `Database.AUTH` (Postgres via `@backend/pg`). Bootstrap (`main.ts`) connects both gRPC and NATS microservices.

## Modules (`src/modules/`)

- **user** — user CRUD. `GrpcUserController` serves `User` / `UserAdmin` / `UserWeb` gRPC services. Emits `UserEventBus` on create (storage subscribes to provision a root folder). `UserRepository.getOneInternal` exposes the password `hash` for login (the public `User` proto never includes it).
- **auth** — `AuthLoginUseCase` (verify password → issue tokens), `AuthRefreshTokenUseCase`, `AuthGetUserByTokenUseCase`. Tokens via `AuthTokenService` → `JwtAuthTokenServiceImpl` (`@nestjs/jwt`, `jwtConfig`). Depends on `UserModule` + `CryptoModule`. **Access tokens are RS256**: signed here with the private key, verified by `api-gateway` with the public key alone, so the payload carries `role` (see `AuthTokenPayload` in `@backend/common`). Refresh tokens stay HS256 — only this service verifies them. Every token also carries its kind as the standard `aud` claim (`AuthTokenAudience`), set and enforced via the jwt `audience` option in `jwtConfig` — so `parse*TokenPayload` reject a token of the wrong kind without a hand-written check. With two different algorithms in play, the key alone no longer separates access from refresh.
- **crypto** — `CryptoService` → `BcryptCryptoServiceImpl` (`hash` / `compare`), returns `Either`.
- **temp-code** — single-use authorization codes (`randomUUID`, `expiredAt` from `tempCode.expiresInMinutes`, `isActive`). CRUD + deactivate use-cases; `CronTempCodeScheduler` deactivates expired codes every minute inside `databaseRunnerService.isolatedRun`. Serves `TempCode` / `Admin` / `Web` gRPC services. **No production consumer**: it used to authorize gRPC stream uploads, which now verify the access token directly — the entity is kept for future use and its admin CRUD.

## Migrator (`src/migrator/`)

Separate Nest app via `PgMigrationModule.register` (entities `PgUserEntity`, `PgTempCodeEntity`). The `create-admin` task seeds the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` — this is how a fresh deployment gets its first login.

## Config & env (`src/config.ts`)

Spreads `commonConfig()` and adds `admin.{email,password}` + `tempCode.expiresInMinutes`. Env: `DATABASE_URL`, `AUTH_GRPC_URL`, `NATS_URL`, `JWT_ACCESS_PRIVATE_KEY_BASE64`, `JWT_ACCESS_PUBLIC_KEY_BASE64`, `REFRESH_JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TEMP_TOKEN_EXPIRES_IN_MINUTES`. The two key vars hold a base64-encoded RSA PEM pair (decoded via `decodeBase64Pem`) — multi-line PEM does not survive `.env` / docker-compose / Railway.

## Commands

```bash
pnpm start:dev        # dotenv → nest start --watch service
pnpm build            # nest build (service + migrator)
pnpm migrate          # SQL migrations + data tasks (also :new / :initial / :sql / :tasks)
pnpm lint
```

## Gotchas

- Reference service: new backend code elsewhere should mirror this layout — don't diverge here.
- Cron/event handlers wrap work in `isolatedRun` for a per-run `EntityManager` context.
- `eslint.config.mjs` wires `@packages/configs` `layerGuard()` alongside `nestConfig` — an inward-only import guard (`interface → infrastructure → application → domain`); it lints clean today, keep new imports pointed inward.
