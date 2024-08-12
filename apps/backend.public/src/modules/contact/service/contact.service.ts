import { Contact } from '@packages/backend.common';
import { RpcContactQuery } from '@packages/backend.transport/generated/public';

export const PUBLIC_SERVICE = Symbol('PublicService');

export interface ContactService {
  getPublicContacts(query?: RpcContactQuery): Promise<Contact[]>;
}
