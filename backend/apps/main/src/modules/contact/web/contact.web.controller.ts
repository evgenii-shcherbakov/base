import { ContactList } from '@packages/grpc.nest';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  CONTACT_REPOSITORY,
  ContactRepository,
} from 'modules/contact/repository/contact.repository';

@Controller('contacts')
export class ContactWebController {
  constructor(@Inject(CONTACT_REPOSITORY) private readonly contactRepository: ContactRepository) {}

  @Get()
  async getMany(@Query() query: any): Promise<ContactList> {
    return {
      items: await this.contactRepository.getMany(query),
    };
  }
}
