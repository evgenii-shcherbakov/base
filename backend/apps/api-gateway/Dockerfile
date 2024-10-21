FROM node:18-alpine AS base

FROM base AS installer
WORKDIR /app
COPY ./apps/backend.api-gateway ./apps/backend.api-gateway
COPY ./packages ./packages
COPY ./package.json ./package.json
COPY ./.gitignore ./.gitignore
RUN yarn install --mode update-lockfile

FROM base AS builder
RUN apk add protobuf
RUN apk add protobuf-dev
RUN apk update
ENV PATH="/usr/bin:${PATH}"
ENV PROTO_PATH="protoc"
ENV NODE_ENV=production
WORKDIR /app
COPY --from=installer /app .
COPY ./turbo.json ./turbo.json
RUN yarn build:backend.api-gateway

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5555
CMD yarn prod:backend.api-gateway
