import { Type } from '@nestjs/common';
import { BaseMigration } from './base/base.migration';

export { BaseMigration };

export const migrations: Type<BaseMigration>[] = [];
