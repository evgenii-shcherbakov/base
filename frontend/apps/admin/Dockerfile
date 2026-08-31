# syntax=docker/dockerfile:1.2

FROM node:22-alpine AS base
ENV CI=true
ENV NODE_ENV=production
ENV TURBO_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1
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
RUN turbo prune frontend.admin --docker

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
ENV GRPC_COMPILER_CONTEXT=frontend
COPY --from=prepare /app/out/json/ .
RUN --mount=type=cache,id=s/54c53b98-cdee-43f5-a168-473e9d2d690d-/pnpm/store,target=/pnpm/store \
    pnpm install \
    --store-dir=/pnpm/store \
    --frozen-lockfile \
    --prod=false
COPY --from=prepare /app/out/full/ .
COPY --from=prepare /app/.prettierrc ./.prettierrc
RUN --mount=type=cache,id=s/54c53b98-cdee-43f5-a168-473e9d2d690d-/app/.turbo,target=/app/.turbo \
    --mount=type=cache,id=s/54c53b98-cdee-43f5-a168-473e9d2d690d-/app/frontend/apps/admin/.next/cache,target=/app/frontend/apps/admin/.next/cache \
    pnpm build

FROM base AS runner
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
COPY --from=builder --chown=nextjs:nodejs /app/frontend/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/apps/admin/.next/static ./frontend/apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/apps/admin/public ./frontend/apps/admin/public
EXPOSE $PORT
WORKDIR /app/frontend/apps/admin
CMD ["node", "server.js"]
