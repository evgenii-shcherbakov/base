import { BackendContact } from '@packages/common';
import { DatabaseEntity } from 'interfaces/database-entity';

export interface ContactBase extends BackendContact {
  isPrimary: boolean;
  isVisible: boolean;
}

export interface Contact extends ContactBase, DatabaseEntity {}