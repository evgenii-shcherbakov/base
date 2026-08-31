# syntax=docker/dockerfile:1.2

FROM node:22-alpine AS base
ENV CI=true
ENV NODE_ENV=production
ENV TURBO_TELEMETRY_DISABLED=1
ENV MALLOC_ARENA_MAX=2
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@11.9.0 --activate
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS prepare
RUN pnpm add -g turbo@2.10.2
COPY . .
COPY ./turbo.prod.json ./turbo.json
RUN turbo prune backend.storage --docker

FROM base AS builder
# Pinned: `protoc` 35.1 stamps the generated sources with `protoc v7.35.1`, which is what the
# committed output under */packages/proto/src carries. Alpine's `protobuf` package tops out at 31.1
# and moves under us, so take the upstream release instead — it is a static binary and needs no
# libc. `include/` ships the well-known types protoc resolves relative to its own path.
ARG PROTOC_VERSION=35.1
RUN apk add --no-cache curl unzip && \
    case "$(apk --print-arch)" in \
      x86_64) PROTOC_ARCH=x86_64 ;; \
      aarch64) PROTOC_ARCH=aarch_64 ;; \
      *) echo "unsupported architecture: $(apk --print-arch)" >&2; exit 1 ;; \
    esac && \
    curl -fsSL -o /tmp/protoc.zip \
      "https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOC_VERSION}/protoc-${PROTOC_VERSION}-linux-${PROTOC_ARCH}.zip" && \
    unzip -q /tmp/protoc.zip -x readme.txt -d /usr/local && \
    rm /tmp/protoc.zip && \
    chmod +x /usr/local/bin/protoc && \
    [ "$(protoc --version)" = "libprotoc ${PROTOC_VERSION}" ]
ENV PROTOC_PATH=/usr/local/bin/protoc
ENV GRPC_COMPILER_CONTEXT=backend
COPY --from=prepare /app/out/json/ .
RUN --mount=type=cache,id=s/f6216b5c-c577-42f4-9eea-fcb6e4349f8c-/pnpm/store,target=/pnpm/store \
    pnpm install \
    --store-dir=/pnpm/store \
    --frozen-lockfile \
    --prod=false
COPY --from=prepare /app/out/full/ .
COPY --from=prepare /app/.prettierrc ./.prettierrc
RUN --mount=type=cache,id=s/f6216b5c-c577-42f4-9eea-fcb6e4349f8c-/app/.turbo,target=/app/.turbo \
    pnpm build
RUN pnpm reset:modules
RUN --mount=type=cache,id=s/f6216b5c-c577-42f4-9eea-fcb6e4349f8c-/pnpm/store,target=/pnpm/store \
    pnpm install \
    --store-dir=/pnpm/store \
    --frozen-lockfile \
    --prod \
    --offline \
    --no-optional

FROM base AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs
COPY --from=builder --chown=nestjs:nodejs /app ./
EXPOSE $PORT
WORKDIR /app/backend/apps/storage
CMD ["sh", "-c", "node dist/migrator/main.js -- pg-migration && node dist/main.js"]
