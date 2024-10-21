import { Contact } from 'interfaces';
import { DatabaseRepository } from 'repositories';

export const CONTACT_REPOSITORY = Symbol('ContactRepository');

export interface ContactRepository extends DatabaseRepository<Contact> {}
