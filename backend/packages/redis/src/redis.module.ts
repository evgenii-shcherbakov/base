import { EventBus, EventBusHost } from '@backend/event-bus';
import { Abstract, DynamicModule, Provider, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomStrategy } from '@nestjs/microservices';
import { REDIS_HOST_EVENTS, RedisClientFactory } from '@/generated';
import {
  globalQueueRegistry,
  RedisConfig,
  redisConfig,
  RedisConnectionService,
  RedisMediatorService,
  RedisParkingService,
  RedisQueueClient,
  RedisSubscriptionRegistry,
  REDIS_CLIENT,
  REDIS_CONFIG_SERVICE,
  REDIS_CONNECTION,
  REDIS_MEDIATOR,
  REDIS_MICROSERVICE_OPTIONS,
  REDIS_PARKING,
  REDIS_SUBSCRIPTION_REGISTRY,
} from '@/infrastructure';
import { RedisEventBusServer } from '@/interface';

type RedisModuleForRootParams = {
  host: EventBusHost;
  onlyEmitting?: boolean;
};

type RedisModuleForFeatureParams = {
  EventBus: Abstract<EventBus>;
};

export class RedisModule {
  static forRoot(params: RedisModuleForRootParams): DynamicModule {
    const providers: Provider[] = [
      {
        provide: REDIS_CONFIG_SERVICE,
        useExisting: ConfigService,
      },
      {
        provide: REDIS_CLIENT,
        inject: [REDIS_CONNECTION, REDIS_CONFIG_SERVICE],
        useFactory: (
          connectionService: RedisConnectionService,
          configService: ConfigService<RedisConfig>,
        ): RedisQueueClient => {
          return new RedisQueueClient(
            connectionService.getClient(),
            configService.getOrThrow('getQueueOptions', { infer: true })(),
          );
        },
      },
      {
        provide: REDIS_SUBSCRIPTION_REGISTRY,
        inject: [REDIS_CONNECTION, REDIS_CONFIG_SERVICE],
        useFactory: (
          connectionService: RedisConnectionService,
          configService: ConfigService<RedisConfig>,
        ): RedisSubscriptionRegistry => {
          return new RedisSubscriptionRegistry(
            connectionService.getClient(),
            configService.getOrThrow('getSubscriptionKey', { infer: true }),
            configService.getOrThrow('getInvalidationChannel', { infer: true })(),
          );
        },
      },
      {
        provide: REDIS_PARKING,
        inject: [REDIS_CONNECTION, REDIS_CLIENT, REDIS_CONFIG_SERVICE],
        useFactory: (
          connectionService: RedisConnectionService,
          client: RedisQueueClient,
          configService: ConfigService<RedisConfig>,
        ): RedisParkingService => {
          return new RedisParkingService({
            client,
            connection: connectionService.getClient(),
            getParkingKey: configService.getOrThrow('getParkingKey', { infer: true }),
            options: configService.getOrThrow('getParkingOptions', { infer: true })(),
          });
        },
      },
      {
        // Owned events are fanned out even in `onlyEmitting` mode — nobody else mediates them.
        provide: REDIS_MEDIATOR,
        inject: [
          REDIS_CONNECTION,
          REDIS_CLIENT,
          REDIS_SUBSCRIPTION_REGISTRY,
          REDIS_PARKING,
          REDIS_CONFIG_SERVICE,
        ],
        useFactory: (
          connectionService: RedisConnectionService,
          client: RedisQueueClient,
          subscriptionRegistry: RedisSubscriptionRegistry,
          parking: RedisParkingService,
          configService: ConfigService<RedisConfig>,
        ): RedisMediatorService => {
          return new RedisMediatorService({
            client,
            parking,
            subscriptionRegistry,
            eventIds: [...(REDIS_HOST_EVENTS[params.host] ?? [])],
            connection: connectionService.getClient(),
            workerOptions: configService.getOrThrow('getWorkerOptions', { infer: true })(),
          });
        },
      },
    ];

    const exports: DynamicModule['exports'] = [REDIS_CONFIG_SERVICE, REDIS_CLIENT];

    if (!params.onlyEmitting) {
      providers.push({
        provide: REDIS_MICROSERVICE_OPTIONS,
        inject: [
          REDIS_CONNECTION,
          REDIS_SUBSCRIPTION_REGISTRY,
          REDIS_PARKING,
          REDIS_CONFIG_SERVICE,
        ],
        useFactory: (
          connectionService: RedisConnectionService,
          subscriptionRegistry: RedisSubscriptionRegistry,
          parking: RedisParkingService,
          configService: ConfigService<RedisConfig>,
        ): CustomStrategy => {
          return {
            strategy: new RedisEventBusServer({
              parking,
              subscriptionRegistry,
              registry: globalQueueRegistry,
              connection: connectionService.getClient(),
              workerOptions: configService.getOrThrow('getWorkerOptions', { infer: true })(),
            }),
          };
        },
      });

      exports.push(REDIS_MICROSERVICE_OPTIONS);
    }

    // Registered last on purpose: Nest runs the shutdown hooks in provider order, so the
    // shared connection is closed only after the workers and queues above are gone.
    providers.push({
      provide: REDIS_CONNECTION,
      inject: [REDIS_CONFIG_SERVICE],
      useFactory: (configService: ConfigService<RedisConfig>): RedisConnectionService => {
        return new RedisConnectionService(
          configService.getOrThrow('getConnectionUrl', { infer: true })(),
          configService.getOrThrow('getConnectionOptions', { infer: true })(params.host),
        );
      },
    });

    exports.push(REDIS_CONNECTION);

    return {
      imports: [ConfigModule.forFeature(redisConfig)],
      providers,
      exports,
      global: true,
      module: RedisModule,
    };
  }

  static forFeature(params: RedisModuleForFeatureParams): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: params.EventBus,
          inject: [REDIS_CLIENT],
          useFactory: (client: RedisQueueClient): Type => {
            return RedisClientFactory.create(client, params.EventBus);
          },
        },
      ],
      exports: [params.EventBus],
    };
  }
}
