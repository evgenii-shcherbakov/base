import { DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheDriver, CacheStore } from '@/domain';
import {
  CACHE_CONFIG_SERVICE,
  CACHE_CONNECTION,
  CacheConfig,
  cacheConfig,
  CacheConnectionService,
  CacheService,
  getCacheDriver,
  MemoryCacheStore,
  RedisCacheStore,
} from '@/infrastructure';

type CacheModuleForRootParams = {
  /** Second key segment — usually the service name, so two services cannot collide. */
  namespace?: string;
  /** Overrides `CACHE_DRIVER`; mostly for specs that want the memory store explicitly. */
  driver?: CacheDriver;
};

export class CacheModule {
  static forRoot(params: CacheModuleForRootParams = {}): DynamicModule {
    // Resolved here rather than inside the factory: with `memory` no ioredis connection
    // provider is registered at all, so the package can run with no Redis in sight.
    const driver = params.driver ?? getCacheDriver();
    const namespace = params.namespace ?? '';

    const providers: Provider[] = [
      {
        provide: CACHE_CONFIG_SERVICE,
        useExisting: ConfigService,
      },
      {
        provide: CacheStore,
        inject: driver === 'redis' ? [CACHE_CONNECTION] : [],
        useFactory: (connectionService?: CacheConnectionService): CacheStore => {
          return connectionService
            ? new RedisCacheStore(connectionService.getClient())
            : new MemoryCacheStore();
        },
      },
      {
        provide: CacheService,
        inject: [CacheStore, CACHE_CONFIG_SERVICE],
        useFactory: (
          store: CacheStore,
          configService: ConfigService<CacheConfig>,
        ): CacheService => {
          return new CacheService(store, {
            namespace,
            keyPrefix: configService.getOrThrow('getKeyPrefix', { infer: true })(),
            defaultTtl: configService.getOrThrow('getDefaultTtl', { infer: true })(),
          });
        },
      },
    ];

    if (driver === 'redis') {
      // Registered last on purpose, the same rule `RedisModule` follows: Nest runs the
      // shutdown hooks in provider order, so the socket closes after everything using it.
      providers.push({
        provide: CACHE_CONNECTION,
        inject: [CACHE_CONFIG_SERVICE],
        useFactory: (configService: ConfigService<CacheConfig>): CacheConnectionService => {
          return new CacheConnectionService(
            configService.getOrThrow('getConnectionUrl', { infer: true })(),
            configService.getOrThrow('getConnectionOptions', { infer: true })(namespace),
          );
        },
      });
    }

    return {
      imports: [ConfigModule.forFeature(cacheConfig)],
      providers,
      // `CacheStore` is exported too, so a consumer that wants the raw port (or a spec that
      // overrides it) does not have to reach through the service.
      exports: [CacheService, CacheStore],
      global: true,
      module: CacheModule,
    };
  }
}
