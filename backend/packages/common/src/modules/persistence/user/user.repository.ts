import { User } from 'interfaces';
import { DatabaseRepository } from 'repositories';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface UserRepository extends DatabaseRepository<User> {}
