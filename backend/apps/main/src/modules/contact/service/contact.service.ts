import { models } from '@packages/grpc.nest';

export const PUBLIC_SERVICE = Symbol('PublicService');

export interface ContactService {
  getPublicContacts(query?: models.Contact.RpcContactRequest): Promise<models.Contact.RpcContact[]>;
}
