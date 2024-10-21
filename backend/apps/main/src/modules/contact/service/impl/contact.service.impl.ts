import { Inject } from '@nestjs/common';
import { Contact, CONTACT_REPOSITORY, ContactRepository } from '@packages/backend.common';
import { RpcContactQuery } from '@packages/backend.transport/generated/public';
import { ContactService } from 'modules/contact/service/contact.service';

export class ContactServiceImpl implements ContactService {
  constructor(@Inject(CONTACT_REPOSITORY) private readonly contactRepository: ContactRepository) {}

  async getPublicContacts(query: RpcContactQuery = { ids: [] }): Promise<Contact[]> {
    return this.contactRepository.getMany({ ...query, isPublic: true });
  }
}
