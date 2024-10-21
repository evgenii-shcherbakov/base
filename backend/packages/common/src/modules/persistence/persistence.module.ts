import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MainDatabaseCollection } from '@packages/common';
import { DynamicModule, Module, Type } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackendMicroserviceEnvironment } from '@packages/environment';
import { MetadataKey } from 'enums';
import { MigrationPersistenceModule } from 'modules/persistence/migration';
import { submodules } from 'modules/persistence/submodules';

@Module({
  imports: [ConfigModule],
})
export class PersistenceModule {
  private static cache: Map<MainDatabaseCollection, Type> = new Map();

  private static loadPersistenceModules() {
    if (this.cache.size) {
      return;
    }

    submodules.forEach((persistenceModule) => {
      const collection: MainDatabaseCollection | undefined = Reflect.getMetadata(
        MetadataKey.PERSISTENCE_MODULE_COLLECTION,
        persistenceModule,
      );

      if (!collection) {
        throw new Error(`Persistence module for collection ${collection} not found`);
      }

      if (this.cache.has(collection)) {
        throw new Error(`Persistence module for collection ${collection} already allocated`);
      }

      this.cache.set(collection, persistenceModule);
    });
  }

  static forRoot(): DynamicModule {
    this.loadPersistenceModules();

    return {
      imports: [
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService<BackendMicroserviceEnvironment>) => {
            return {
              uri: configService.get('DATABASE_URL'),
              autoIndex: true,
              autoCreate: true,
            };
          },
        }),
        MigrationPersistenceModule,
      ],
      exports: [MongooseModule],
      module: PersistenceModule,
    };
  }

  static forFeature(...collections: MainDatabaseCollection[]): DynamicModule {
    this.loadPersistenceModules();

    const persistenceModules = collections.map((collection) => {
      if (!this.cache.has(collection)) {
        throw new Error(`Persistence module for collection ${collection} not found`);
      }

      return this.cache.get(collection);
    });

    return {
      imports: [...persistenceModules],
      exports: [...persistenceModules],
      module: PersistenceModule,
    };
  }
}
