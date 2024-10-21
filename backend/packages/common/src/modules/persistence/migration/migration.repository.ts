import { Migration } from 'interfaces';
import { DatabaseRepository } from 'repositories';

export const MIGRATION_REPOSITORY = Symbol('MigrationRepository');

export interface MigrationRepository extends DatabaseRepository<Migration> {
  getSuccessMigrationNames(): Promise<string[]>;
}
