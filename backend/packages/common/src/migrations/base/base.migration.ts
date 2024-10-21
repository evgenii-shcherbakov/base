import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackendEnvironment } from '@packages/environment';
import { Connection } from 'mongoose';

export abstract class BaseMigration {
  protected readonly logger = new Logger(this['constructor'].name);

  constructor(
    protected readonly connection: Connection,
    protected readonly configService: ConfigService<BackendEnvironment>,
  ) {}

  abstract run(): Promise<void>;
}
