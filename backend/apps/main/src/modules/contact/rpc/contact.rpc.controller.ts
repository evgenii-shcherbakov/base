import { ContactRequestDto } from '@backend/common';
import { GrpcController, ValidateGrpcPayload } from '@backend/transport';
import { Metadata } from '@grpc/grpc-js';
import { Inject } from '@nestjs/common';
import {
  ContactList,
  ContactRequest,
  ContactServiceController,
  ContactServiceControllerMethods,
} from '@packages/grpc.nest';
import {
  CONTACT_REPOSITORY,
  ContactRepository,
} from 'modules/contact/repository/contact.repository';

@GrpcController()
@ContactServiceControllerMethods()
export class ContactRpcController implements ContactServiceController {
  constructor(@Inject(CONTACT_REPOSITORY) private readonly contactRepository: ContactRepository) {}

  @ValidateGrpcPayload(ContactRequestDto)
  async getMany(request: ContactRequest, metadata: Metadata): Promise<ContactList> {
    console.log(request, metadata);

    return {
      items: await this.contactRepository.getMany(request.query),
    };
  }
}
