import { MigrationStatusEnum } from 'enums';
import { DatabaseEntity } from 'interfaces/database-entity';

export interface MigrationBase {
  name: string;
  status: MigrationStatusEnum;
  errorMessage?: string;
}

export interface Migration extends MigrationBase, DatabaseEntity {}
