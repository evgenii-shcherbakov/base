import { DatabaseEntity } from 'interfaces/database-entity';

export interface UserBase {}

export interface User extends UserBase, DatabaseEntity {}
