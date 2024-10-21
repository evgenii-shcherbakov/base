import { MainContact } from '@packages/common';
import { DatabaseEntity } from 'interfaces/database-entity';

export interface ContactBase extends MainContact {}

export interface Contact extends ContactBase, DatabaseEntity {}
