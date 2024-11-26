import { DatabaseRepository } from '@backend/persistence';
import { Contact } from '@packages/grpc.nest';

export const CONTACT_REPOSITORY = Symbol('ContactRepository');

export interface ContactRepository extends DatabaseRepository<Contact> {}
