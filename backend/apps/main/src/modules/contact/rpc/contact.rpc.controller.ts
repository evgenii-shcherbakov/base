import {
  ContactRequest,
  ContactList,
  ContactServiceControllerMethods,
  ContactServiceController,
} from '@packages/grpc.nest';
import { Controller, Inject } from '@nestjs/common';
import {
  CONTACT_REPOSITORY,
  ContactRepository,
} from 'modules/contact/repository/contact.repository';

@Controller()
@ContactServiceControllerMethods()
export class ContactRpcController implements ContactServiceController {
  constructor(@Inject(CONTACT_REPOSITORY) private readonly contactRepository: ContactRepository) {}

  async getMany(request: ContactRequest): Promise<ContactList> {
    console.log(await this.contactRepository.getMany(request.query));
    return {
      items: await this.contactRepository.getMany(request.query),
    };
  }
}
