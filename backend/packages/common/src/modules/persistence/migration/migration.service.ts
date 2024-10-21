import { Inject, Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { BackendEnvironment } from '@packages/environment';
import { MigrationStatusEnum } from 'enums';
import { BaseMigration } from 'migrations';
import { MIGRATIONS } from 'modules/persistence/migration/migration.constants';
import {
  MIGRATION_REPOSITORY,
  type MigrationRepository,
} from 'modules/persistence/migration/migration.repository';
import { Connection } from 'mongoose';

@Injectable()
export class MigrationService implements OnModuleInit {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    protected readonly configService: ConfigService<BackendEnvironment>,
    @InjectConnection() private readonly connection: Connection,
    @Inject(MIGRATIONS) private readonly migrations: Type<BaseMigration>[],
    @Inject(MIGRATION_REPOSITORY) private readonly repository: MigrationRepository,
  ) {}

  async onModuleInit() {
    const successMigrationsNames = await this.repository.getSuccessMigrationNames();

    const leastMigrations = this.migrations.filter((migrationClass) => {
      return !successMigrationsNames.includes(migrationClass.name);
    });

    for (const MigrationClass of leastMigrations) {
      const instance = new MigrationClass(this.connection, this.configService);
      const migrationName = MigrationClass.name;

      try {
        this.logger.log(`Start ${migrationName} migration...`);
        await instance.run();
        await this.repository.saveOne({ name: migrationName, status: MigrationStatusEnum.SUCCESS });
        this.logger.log(`${migrationName} migration completed`);
      } catch (error) {
        const errorMessage = error?.['message'] ?? 'unknown error';
        this.logger.error(errorMessage, error?.['stack']);

        await this.repository.saveOne({
          name: migrationName,
          status: MigrationStatusEnum.FAILED,
          errorMessage,
        });
      }
    }
  }
}
