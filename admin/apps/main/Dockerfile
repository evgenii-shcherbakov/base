FROM node:18-alpine AS base

FROM base AS installer
WORKDIR /app
COPY ./admin/apps/main ./admin/apps/main
COPY ./packages ./packages
COPY ./libraries ./libraries
COPY ./package.json ./package.json
COPY ./.gitignore ./.gitignore
RUN yarn install --mode update-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app .
COPY ./turbo.json ./turbo.json
RUN yarn build:admin

FROM base AS runner
ENV NODE_ENV=production
ENV PAYLOAD_CONFIG_PATH=dist/payload.config.js
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3336
CMD yarn prod:admin
